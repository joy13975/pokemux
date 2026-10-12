import sys

rows = [('Field', 'Value'), ('Request', 'GET /api/v1/maintenance-window'), ('Target', 'an app task on port 8000'), ('What happened', 'the target closed the connection'), ('Neighbouring requests', 'the same tasks served normally')]
left, right = 23, 37
print('\033[2J\033[H', end='')
print('Monitor event: ANOMALY  00:32:07  ALB 5xx')
print('┌' + '─' * left + '┬' + '─' * right + '┐')
for index, (label, value) in enumerate(rows):
    print('│ ' + '\033[1m' + label.ljust(left - 2) + '\033[0m' + ' │ ' + '\033[36m' + value.ljust(right - 2) + '\033[0m' + ' │')
    if index < len(rows) - 1:
        print('├' + '─' * left + '┼' + '─' * right + '┤')
print('└' + '─' * left + '┴' + '─' * right + '┘')
print('Powerline: \ue0a0 \ue0b0 \ue0b1 \ue0b2 \ue0b3  日本語 😀')
sys.stdout.flush()
