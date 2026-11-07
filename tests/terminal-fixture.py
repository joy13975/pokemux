import os
import subprocess
import sys
import tty

sys.stdout.write('POKEMUX_TEST_READY\r\n\x1b[?2004h')
if len(sys.argv) > 1:
    with open(sys.argv[1], 'w') as log:
        log.write('POKEMUX_TEST_READY\n')
sys.stdout.flush()
tty.setraw(sys.stdin.fileno())
while True:
    data = os.read(sys.stdin.fileno(), 1024)
    if not data:
        break
    if data == b'\x13':
        subprocess.run(['/usr/bin/less'], input=''.join(f'WHEEL_CANARY_{n:04d}\n' for n in range(1000)).encode(), check=True)
    elif data == b'\x07':
        size = os.get_terminal_size()
        sys.stdout.write(f'PTY {size.columns}x{size.lines}\r\n')
    elif data == b'\x12':
        sys.stdout.write('\x1b[?1049h\x1b[?1000h\x1b[?1006h\x1b[2J\x1b[HURL https://example.com/ \r\nTUI_CLICK_CANARY\r\n')
    elif data == b'\x14':
        sys.stdout.write('\x1b[?1049h\x1b[?1000h\x1b[?1006hMOUSE_WHEEL_READY\r\n')
    elif data == b'\x1d':
        sys.stdout.write(''.join(f'POKEMUX_HISTORY_{row}:' + 'x' * 70 + '\r\n' for row in range(4005)))
    elif data == b'\x1f':
        sys.stdout.write('\x1b[3J\x1b[2J\x1b[H')
        for value in ['ASCII', '\x1b[1mBOLD\x1b[0m', '\x1b[44mPowerline \ue0b0\x1b[0m', '日本語 😀', 'CURSOR']:
            sys.stdout.write(value + '\x1b[22G|\r\n')
        sys.stdout.write('\x1b[5;22H')
    elif data == b'\x1e':
        sys.stdout.write('\x1b[3J\x1b[2J\x1b[HPOKEMUX_TEST_READY\r\n')
    sys.stdout.write('RECV:' + data.hex() + '\r\n')
    sys.stdout.flush()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'a') as log:
            log.write('RECV:' + data.hex() + '\n')
