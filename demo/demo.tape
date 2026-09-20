Output shipit-gate-demo.gif

Set FontSize 16
Set Width 1200
Set Height 720
Set Theme "Catppuccin Mocha"
Set Padding 24
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0

Hide
Type "cd /tmp && rm -rf shipit-demo && mkdir -p shipit-demo/migrations shipit-demo/src/payments && cd shipit-demo && git init -q && git config user.email d@d && git config user.name d && echo a > migrations/add_billing.sql && echo a > src/payments/index.ts && git add -A && git commit -qm init && echo b >> migrations/add_billing.sql && echo b >> src/payments/index.ts && git checkout -qb feat/new-billing 2>/dev/null; clear"
Enter
Sleep 500ms
Show

Type "# Friday 5pm. Migration + payments. Let's ship it..."
Sleep 800ms
Enter

Type "shipit check --mock=blocked --base HEAD~1"
Sleep 400ms
Enter
Sleep 5000ms

Type "clear"
Enter
Sleep 300ms

Type "# Tuesday morning. Small typo fix."
Sleep 800ms
Enter

Type "shipit check --mock=safe --base HEAD~1"
Sleep 400ms
Enter
Sleep 4000ms
