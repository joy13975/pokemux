import os
import select
import sys
import tty

tty.setraw(sys.stdin.fileno())
with open(sys.argv[1], 'w') as log:
    log.write('POKEMUX_TEST_READY\n')
sys.stdout.write('\x1b[?1049h\x1b[2J')
frame = 0
while True:
    frame += 1
    sys.stdout.write('\x1b[H' + '\r\n'.join(f'LIVE_GESTURE_{row:02}_{frame:06} ' + 'x' * 65 for row in range(25)))
    sys.stdout.flush()
    if select.select([sys.stdin], [], [], .04)[0]:
        data = os.read(sys.stdin.fileno(), 1024)
        if not data:
            break
        with open(sys.argv[1], 'a') as log:
            log.write('RECV:' + data.hex() + '\n')
