import os
import select
import sys
import termios
import tty

log = sys.argv[1]
original = termios.tcgetattr(0)
tty.setraw(0)
try:
    sys.stdout.write('\x1b[?1049h\x1b[?1000h\x1b[?1006h\x1b[2J\x1b[H')
    sys.stdout.write('POKEMUX CLICK TEST\r\n')
    sys.stdout.write('\x1b]8;;https://example.com/pokemux-hidden-target\x1b\\\x1b[4mOpen the benchmark report on Artiport\x1b[0m\x1b]8;;\x1b\\\r\n')
    sys.stdout.write('https://example.com/pokemux-visible-target\r\n')
    sys.stdout.write('Tap any terminal cell; raw mouse reports appear below.\r\n')
    sys.stdout.flush()
    while True:
        if not select.select([0], [], [], 1)[0]:
            continue
        data = os.read(0, 4096)
        if data == b'\x03':
            break
        with open(log, 'ab') as output:
            output.write(data)
        sys.stdout.write('\x1b[7;1HRECEIVED:' + data.hex() + '\x1b[K')
        sys.stdout.flush()
finally:
    sys.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?1049l')
    sys.stdout.flush()
    termios.tcsetattr(0, termios.TCSADRAIN, original)
