# Native iPhone viewport and keyboard canary

Run `POKEMUX_CANARY_NONINPUT=1 node tests/render-browser-fixture.mjs` from the checkout. The loopback fixture simulates an authenticated session and contains sample output. It has no cmux connection.

Use the iPhone 13 Pro Max Simulator with the software keyboard enabled. Open `http://localhost:4392/` in Safari and set Page Zoom to 50% through Safari's Page Menu.

1. Reload the root URL in portrait. Open the workspace drawer before selecting anything. The controls should be the same size as at 100%, and the drawer should occupy about three quarters of the phone width. The first tab is a browser preview, so native text focus cannot mask the layout.
2. Stow the drawer, tap **Second terminal**, drag left within the terminal, and tap the terminal again. The horizontal position should hold and the native keyboard should stay closed.
3. Rotate to landscape with the terminal open. Keep the same page loaded. The app should fill the space between the safe insets and show one shortcut row. Open and stow the left drawer and right menu. Each should cover the controls beneath it and leave its own controls reachable outside the notch.
4. Open the floating quick actions and tap **Show keyboard**. Tap **X** on the iOS keyboard. The fixture should log one input action with text `x` for the second terminal. The floating handles should sit beside the shortcut strip. Reopen quick actions and tap **Hide keyboard**. The keyboard should close and the terminal should regain the available height.
5. With the native keyboard still visible, pull each drawer in from the corresponding edge. Stow it without selecting an action. The keyboard should stay visible and the next native key should reach the same terminal. Repeat from a Home Screen installation of the fixture.
6. With the same terminal selected, rotate to landscape, show and hide the native keyboard there, then return directly to portrait. Check the status-bar gap and bottom alignment, tap the floating quick actions, and drag the joystick. Both controls should respond at their painted positions.
7. Restore Safari's zoom and Simulator's keyboard settings, blank the fixture tab, and stop the fixture.

Use native Simulator taps and drags. Compare bootstrap geometry after Safari's resize settles because WebKit can report the new scale before it updates the visual viewport dimensions.

## Home Screen rotation and full-screen terminal drawers

Start the loopback fixture with `POKEMUX_CANARY_TUI=1 node tests/render-browser-fixture.mjs`. Open it from the iPhone 13 Pro Max Home Screen. At Safari Page Zoom 50%, rotate to landscape, show and dismiss the native keyboard, and rotate directly back. Tap the joystick and quick actions at their visible centers, then cancel a short header pull. The joystick changes mode, quick actions open, and the tab rail returns to its original height. The Simulator does not reproduce the physical phone's stale hit region.

In the same fixture, drag horizontally inside the terminal to each scroll limit, then continue an intentional pull toward the interior. Each drawer should open on release after the pull crosses its commit point. A shorter pull stows the preview. The fixture uses the same alternate-screen mouse reporting that preceded canceled pointer events in the physical trace.
