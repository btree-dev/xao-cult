# xaomsg

Xao messaging via Waku. Wallet signs a 24-hour session certificate once per day;
the session key signs every message body. Bodies are encrypted with a per-thread
AES key and broadcast on opaque Waku content topics derived from the ShowContract
address.

See `docs/superpowers/plans/2026-04-22-xaomsg-phase1-waku.md` for design.
