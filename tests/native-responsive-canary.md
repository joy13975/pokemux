# Native iPhone viewport and keyboard canary

Run `POKEMUX_CANARY_NONINPUT=1 node tests/render-browser-fixture.mjs` from the checkout. The loopback fixture simulates an authenticated session and contains sample output. It has no cmux connection.

Use the iPhone 13 Pro Max Simulator with the software keyboard enabled. Open `http://localhost:4392/` in Safari and set Page Zoom to 50% through Safari's Page Menu.

1. Reload the root URL in portrait. Open the workspace drawer before selecting anything. The controls should be the same size as at 100%, and the drawer should occupy about three quarters of the phone width. The first tab is a browser preview, so native text focus cannot mask the layout.
2. Stow the drawer, tap **Second terminal**, drag left within the terminal, and tap the terminal again. The horizontal position should hold and the native keyboard should stay closed.
3. Rotate to landscape with the terminal open. Keep the same page loaded. The app should fill the space between the safe insets and show one shortcut row. Open and stow the left drawer and right menu. Each should cover the controls beneath it and leave its own controls reachable outside the notch.
4. Open the floating quick actions and tap **Show keyboard**. Tap **X** on the iOS keyboard. The fixture should log one input action with text `x` for the second terminal. The floating handles should sit beside the shortcut strip. Reopen quick actions and tap **Hide keyboard**. The keyboard should close and the terminal should regain the available height.
5. Restore Safari's zoom and Simulator's keyboard settings, blank the fixture tab, and stop the fixture.

Use native Simulator taps and drags. Compare bootstrap geometry after Safari's resize settles because WebKit can report the new scale before it updates the visual viewport dimensions.
