# Pokemux — review ledger

This is the authoritative checklist of all feedback entries. Repeated reports and superseded instructions remain visible. Pokemux uses its own passkeys and stock cmux's local API. This fork restored browser access at the same approved origin. Independent native Safari testing reproduced focus-induced page zoom, selected-paste frozen output and no-op deletion losing the insertion caret; fixes and their evidence are below. Browser touch checks cover actual input-engine gestures, not dispatched DOM events. The photographed tiny offset text remains open; no synthetic pass establishes that specific fix.

1. Explain confusing controls.
   Delivered the previous screenshot’s control-by-control explanation. Current UI removes the redundant controls instead of adding more explanation.

2. More terminal space; minimal UI.
    Browser verified: compact header and tab strip; no default input row or repeated target/status rows. The shortcut rail gives its space to the terminal while input is inactive, and is hidden while extended shortcuts are open.

3. Dark mode by default.
   Browser verified in the previous revision. Retained throughout output, sidebar, sheets, and native controls.

4. Why distinguish Compose and Terminal?
   Explained direct keystrokes versus a local editable draft. Superseded by item 26: Compose is now removed entirely.

5. No default submit button.
   Implemented: no submit button or draft editor in the default interface. Compose has been removed by item 26.

6. No visible text field for direct input; tap terminal to type.
   Implemented: the terminal output itself is the native editable input surface. No separate visible or hidden input field. You confirmed on iPhone that touching it now supports selection and paste. Automatic focus zoom is a separate issue in item 50.

7. Small opt-in Compose icon; textarea appears only when on.
   Superseded by item 26: remove Compose and its pencil toggle entirely.

8. Keys button crowds shortcut rail.
    Removed from the rail. Your later gesture request supersedes the floating Keys button: swipe left for the top panel, with an accessible entry in the single app menu. Browser opening/focus checks pass.

9. Remove “Needs input” banner.
   Removed. Orange tab indicator carries that state. Current metadata comes from cmux lifecycle events. Physical notification acceptance remains open.

10. One top-right menu, not three.
    Implemented: one top-right menu. Later refinements in items 39–41 and 45–46 remove redundant actions and move workspace operations into the sidebar.

11. Draggable tabs.
    Browser verified: drag visibly reorders the phone tab strip and persists across reload. A reproduced bug moved tabs between cmux panes; the fix preserves pane IDs, membership and the active input target. Handler regression failed before and passes after; rendered ordering/reload checks pass.

12. Swipe right opens left sidebar.
    Superseded by118: left icon opens sidebar; terminal horizontal gestures only pan. Earlier gesture evidence remains historical.

13. Swipe left opens keys panel.
    Superseded by116: swipe UP on shortcut rail expands integrated panel above keyboard; terminal horizontal gestures only pan.

14. Remove sidebar “Ready…” / “Waiting…” status text.
    Browser verified: description/status paragraphs removed. Small state indicators retain accessible labels.

15. Keep a complete review ledger.
    Reconciled all original and later requests, including your latest instruction to log every request. Repeated ledger reminders also remain in items 31 and 51. This file is served privately and available from App menu → Review changes.

16. Fuller screen on iOS.
    Added Home Screen web-app metadata, manifest, and icon. Safari → Share → Add to Home Screen → Open as Web App → Add, then launch the icon. This requires an action on your iPhone; a website cannot perform it itself. Owned iPhone13ProMax Simulator Home Screen launch and native keyboard check passed; physical launch remains pending.

17. Remove fat gap below controls when keyboard opens.
    Browser geometry and three native Safari keyboard cycles keep the rail at the web viewport bottom. App layout reserves the rail height without an extra gutter. Native Home Screen check removes address chrome, retains iOS form-accessory strip and places app rail directly above it; physical acceptance remains open.

18. Dismiss every modal by tapping outside.
    Browser verified for the shared modal backdrop and nonmodal shortcuts dropdown. Taps inside remain active.

19. Split creation / switching do not work or are unclear.
    Superseded by items 38 and 45: no split creation or Switch terminal action. All existing terminal tabs appear in one workspace strip, and one terminal fills the display. Original reproduced failures were a nonfunctional phone layout toggle and a 273 px secondary terminal in a 390 px viewport.

20. Keyboard must reveal shortcuts and the active input line.
    Browser reduced-height checks and three native iPhone13ProMax Safari keyboard engagements show the shortcut rail each time and keep the authoritative cursor/input above it. Physical-device acceptance remains open.

21. Remove unnecessary icons in tabs.
    Browser verified: no terminal/file/browser tab prefixes; names and compact state indicators remain.

22. Text selection while the keyboard is showing.
    Confirmed by you on iPhone after replacing the separate input receiver with the terminal editing surface: text selection now works. Retain native selection rather than synthesizing a separate selection UI. See item 50 for the new focus-zoom regression.

23. Paste into terminal.
    Confirmed by you on iPhone: native paste is now available directly in the terminal editing surface. Removed the separate paste sheet and menu action. Paste inserts text without automatically pressing Enter.

24. Remove unnecessary workspace-group icons; show hierarchy clearly.
    Browser verified: plain group headings, indented children and a hierarchy line; folder and group-plus icons removed.

25. Organize menu and remove useless actions.
    Implemented static Terminal / App sections in the top menu, and workspace actions on sidebar rows. No expand/collapse menus, keyboard-dismiss action, extra tab menu, current-screen/scrollback mode, paste command, Switch terminal or rename-tab button.

26. Remove Compose entirely; direct terminal input must be sufficient.
    Browser verified: no Compose, draft state, default textarea, submit or floating input toggle. Native direct typing/selection/paste are exercised in the terminal surface.

27. One user-defined custom shortcut group, up to 10 shortcuts.
    Browser verified: create/edit/delete/execute and persistence, ten-item limit and disabled eleventh item. Agent-created shortcut fixtures removed. Named label/chord layout verified in Customize.

28. User-defined snippets.
    Browser verified: multiline snippet creation, persistence and literal insertion without Enter; editing and confirmed deletion passed. Removed the hardcoded sample snippets and agent-created test fixture.

29. Left-swipe keys panel drops from the top, leaving terminal visible.
    Implemented top dropdown with bounded height and internal scrolling. Later items 47–49 reduce height and separate its raised surface from output. Opening it must preserve an already active keyboard but must not initiate one.

30. Drag-down refresh activates only from the top bar.
    Implemented page reload restricted to a pull starting on the top bar. The visible, release-only, reversible gesture is tracked in item 43.

31. Keep updating the ledger as feedback arrives.
    Updated through all requests in the visible conversation, including zoom, full-ledger reconciliation and intent-led class-level design. Superseded instructions and outstanding physical-iPhone checks remain explicit.

32. Pull-down refresh means reload the entire web page.
    Actual browser touch records exactly one Document request after an armed header release and none after returning before release or dragging terminal output. Handler tests also cover cancellation and diagonal disarming. Changed terminal replay snapshots arrive independently over SSE. Native pull gesture remains unverified.

33. Clicking a workspace group changes its name but not its tabs.
    Browser verified: selecting AO and agentstrap group anchors changes heading, tab identity/title and terminal pwd content together. Earlier sample anchors had identical names and output despite distinct IDs. Current adapter uses authoritative UUIDs and updates workspace identity and tabs together. Live group selection acceptance remains part of item42.

34. Paste must be available through terminal long hold or double tap.
    Native Safari double-tap → Copy → Paste → typing passes with immediate authoritative echo and exact delivery. No custom paste button or sheet. Reliable timed long-hold and selection-handle actuation remain unavailable in the current controller.

35. Long hold must select terminal output while the keyboard is showing.
    Confirmed by your subsequent iPhone report: selection works in the terminal editing surface. Current render-grid updates defer painting while text is selected. Metadata updates preserve the terminal DOM, caret, selection and scroll; regressions cover that state.

36. Separate custom shortcut name from its content.
    Browser verified: custom shortcut row separates its name and chord with spacing and a middle dot. Native accessible name also includes the separator.

37. Remove customization space waste and hidden group-ordering UI.
    Browser verified: customization uses available space without a fixed blank filler; toolbar group order appears directly after shortcut controls. Ordering survives reload; scroll cue appears only when more content exists.

38. Rename the app Pokemux and remove terminal split creation.
    Pokemux naming, manifest and icon implemented; split creation, multi-pane display and orphaned controls removed. Browser verified: all existing sample tabs, including tabs from another pane, are reachable in one strip. Original pane membership is preserved.

39. Remove View scrollback, Current screen, and Paste into terminal menu entries.
    Implemented: output modes and the separate paste sheet are removed. You subsequently confirmed native terminal selection/paste on iPhone.

40. Workspace actions belong in the sidebar, not the top-right menu.
    Implemented: workspace operations are only in sidebar row actions. Top-right menu contains Terminal / App sections.

41. Use plain menu sections; remove expand/collapse controls.
    Implemented static section headings without disclosure controls.

42. Finish every ledger item, connect real cmux, and test extensively only on new workspaces/tabs.
    Fresh real-cmux acceptance now passes on newly created owned workspaces: 11 adapter checks and seven combined actual-touch checks, with all current code active. Cleanup confirms existing identities, names, order and selection unchanged. An earlier cleanup detected a stock automatic-title flush; that historical failure remains recorded. No existing-terminal input or rename occurred. Physical-device and original tiny-text acceptance gaps remain explicit below.

43. Standard visible pull-to-refresh, with cancellation when dragged back before release.
    Actual touch verifies page displacement, visible Release to refresh feedback, return-before-release cancellation and exactly one whole-document reload on armed release. Handler regressions also cover short pulls and OS cancellation. Native/physical gesture acceptance remains open.

44. Left/right swipes stopped working.
    Removed the reproduced blanket contenteditable exclusion. Actual browser touch now verifies reading navigation, typing Left/Right, panel-only dismissal, zero accidental swipe delivery and first-key delivery after reopening. Native fast swipe remains unsupported by the controller.

45. Remove Switch terminal; workspace navigation already covers it.
    Removed both the menu action and the leftover Open terminal tab button on nonterminal surfaces. Workspace tabs/sidebar provide navigation; nonterminal surfaces do not reserve an input dock.

46. Rename a tab by long press or double click on its name; remove menu button.
    Browser verified double-click rename; pointer long-hold handler is implemented, and movement cancels its timer for dragging. Menu button removed. Physical long-touch check remains pending.

47. Opening Keyboard Shortcuts must not summon the iPhone keyboard.
    Native Safari menu → Shortcuts → Tab leaves the keyboard hidden while delivering exactly one Tab. Browser reading-swipe opening and first-key delivery preserve reading focus; an already typing terminal retains its keyboard.

48. Separate shortcut-panel styling from terminal output.
    Updated browser screenshot verifies a raised panel, separator and shadow distinct from output. Redundant title row and duplicate rail are removed.

49. Keep the terminal readable while shortcut UI is open.
    Browser geometry verifies a readable terminal region below the compact dropdown, with the input line visible and no overlap. Customize uses more space for editing. Physical readability check remains pending.

50. No automatic zoom when touching the terminal; pinch zoom remains available.
    Native Safari reproduced whole-page focus zoom at12px typing display size. Transform scaling on a bounded terminal canvas keeps the editable layout font16px; three native keyboard cycles retain header/tab geometry. Browser two-finger pinch changes terminal content while chrome remains scale1; Reset/reverse pinch reach full view. Your requested typing-size preference remains local to terminal content. Native pinch and physical iPhone remain unverified.

51. Ledger must include every issue, not just the latest.
    Reconciled against the complete visible conversation, retaining earlier requests and their superseding corrections. Original product requirements are individually listed below; no historical item is silently deleted.

52. Study Termius iPhone keyboard and shortcuts.
    Original requested reference is Termius iPhone, correcting the initial Terminus name. Official mobile-terminal keyboard guide reviewed; compact rail, groups and extended keys inform the design. Latest direct-touch behavior follows your Termius comparison.

53. Match cmux full-window hierarchy, grouped workspaces, tabs and names.
    Preserve window/group/workspace/tab identities, names and ordering. Minimal group headings and indentation, selected workspace tab strip, one terminal at a time. Current tree reads real cmux windows, groups, workspaces and surfaces; full browser parity acceptance remains item42.

54. Access remotely from iPhone over Tailscale while away from the Mac.
    The loopback bridge is installed as a launch agent. The former HTTP preview now shows HTTPS activation instructions. The private HTTPS origin now routes to the real passkey setup. The enrolled passkey and private HTTPS deployment are verified. Fresh real-cmux checks pass under item130; physical-phone access acceptance remains separate.

55. Passkey authentication is accepted; Face ID should handle normal unlock.
    Production design uses WebAuthn passkeys and iPhone system user verification. Face ID is the device experience, not a standalone server authentication scheme. Real WebAuthn registration/authentication verification is implemented and tested with signed credentials and invalid-signature/origin/challenge/RP/user-verification rejection. The live server now reports an enrolled passkey. Face ID behavior itself is not verified by desktop checks.

56. Fix classes of design problems rather than individual complained instances.
    Active review applies terminal-first space use, direct manipulation, deliberate focus/zoom, contextual controls, visible cancelable gestures, compact hierarchy/status and one state source. Every ledger item must pass these principles with runtime evidence.

57. For every action, evaluate the user intent, primary/secondary information, gesture alternatives, space and compact clarity.
    Applied as the review rubric in DESIGN.md and this ledger. User intent drives what is visible; a secondary control must justify its permanent space. Gesture alternatives preserve discovery and accessibility without duplicating an everyday control.

58. Focus zoom affects shortcut modal as well as terminal input.
    Same focus/scaling repair as50. Native menu/Shortcuts/Tab does not summon the keyboard. Actual browser pinch within Shortcuts leaves page scale1; native multitouch remains unverified.

59. After manually unpinching, terminal cursor is hidden by the bad scroll state.
    Browser verified: dropdown space is reserved rather than covering the terminal; resizing reveals active input without disrupting selection. Pinch-scale regression is covered. At the tested keyboard-sized viewport, the input line remains inside the visible terminal. Physical unpinch/keyboard combination remains pending.

60. Show more shortcut buttons: make them smaller and remove gaps.
    Browser verified: denser extended grid shows18 complete keys at the tested keyboard-sized viewport, compared with12 in your unzoomed screenshot. Smaller keys, near-zero gaps and compact integrated close/navigation leave the terminal visible.

61. Make scrollable shortcut/customization areas obvious.
    Browser verified: panel fade/chevron disappears at the scroll end; horizontal rail shows a right-edge cue while more keys exist. Customize has no fixed blank spacer.

## Additional feedback — 2026-10-08

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 62 | Tab headers look like loose text; need clear boundaries. | Each tab has a visible border and shaped upper corners, with the existing blue active edge. Tab-strip height unchanged. Rendered browser verified: visible 1px boundaries, each tab remains 45px tall. |
| 63 | Ctrl+C → Cancel leaves Ctrl highlighted although the next character is plain. | Reproduced in browser and failing regression. Modifier buttons in rail/panel now project from one state; consuming Ctrl clears all visuals before confirmation. Passing regression and rendered browser check; Cancel restores the native caret so the next character is delivered. |
| 64 | With keyboard out, left/right swipes should be arrow keys. | Actual browser input-engine touch delivers exactly Left then Right while typing, with focus preserved; reading swipes navigate. Selection and vertical scrolling retain their own interaction. Native fast swipe remains unverified. |
| 65 | Remove preview-input recording; connect real cmux to test cursor behavior. | Sample agents and input recording removed. Persistent local RPC reads the viewed terminal's authoritative grid and cursor; changed snapshots stream to the browser. Real browser cursor, input/paste, switching, reconnect and large-history/erase checks pass on owned fixtures. A phone passkey is now enrolled; physical interaction acceptance remains open. |

## Connection preference — 2026-10-09

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 66 | Prefer connecting to stock cmux without modifying it. | External Node bridge uses stock cmux's local API. No cmux source/settings change, rebuild or restart. Native vendor helper and enrollment are removed. Local adapter and live browser tests pass. |

## Setup feedback — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 67 | Make this Mac discoverable is greyed out; inspect it directly. | Confirmed directly in Settings: discoverability is greyed out because Devices requires Cloud Machines. No toggle changed. That gate belongs to cmux's native remote path and is irrelevant to the implemented free local-API bridge. Proof: proof-discoverability-disabled.png. |

## Free local API and independent clients — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 68 | A paid cmux prerequisite defeats Pokemux because the paid plan includes its own iOS app. | No paid cmux feature is required. Cloud/Devices guidance withdrawn; obsolete native helper, build dependencies, own vendor identity and email-code setup removed. |
| 69 | Start our own remote helper and authenticate through Pokemux. | Implemented: Pokemux authenticates the phone with its own passkeys and serves a local-API mirror. No vendor enrollment. Browser E2E passes with a temporary test session; the live server now reports an enrolled passkey; physical interaction acceptance remains open. |
| 70 | Check existing cmux iOS apps; why not obtain output through cmux API server-side? | Reviewed Cmux Remote and Telecmux primary sources. Cmux Remote uses timed terminal.replay polling; Telecmux documents ~1.5s screen polling over SSH. Pokemux now samples the local authoritative grid and pushes changes over SSE. cmux itself does not provide a continuous local output subscription. Earlier real browser checks pass; the latest changes require a fresh real run; no paid feature or cmux patch. |

## Phone regressions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 71 | Real terminal scaling is wrong; text and prompt are cropped on iPhone. | Implemented full-grid overview fitting without resizing the Mac PTY, plus independent typing zoom. Actual wide-grid overflow was reproduced before the fit fix and browser widths verified afterward. Physical iPhone acceptance remains open. |
| 72 | Left/right swipes fail; horizontal terminal scrolling may take precedence. | Width fitting removes unintended overview overflow. Reading swipes navigate, typing swipes send arrows, and an open shortcut panel consumes its dismissing swipe. Combined browser gestures pass; physical touch arbitration remains open. |

## Input, zoom and floating functions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 73 | Typed text sometimes disappears. | Reproduced a live repaint deleting native composition; composition listeners and paint deferral implemented. Regression fails before, passes after. Real iPhone acceptance remains open. |
| 74 | A second cursor appears in the wrong position. | Native browser caret hidden; cmux cursor retained. The subsequent offset report is tracked separately below. |
| 75 | After left swipe opens shortcuts, right swipe must only dismiss shortcuts. | Gesture remembers the open panel at contact start; covers swipes within the panel and below it. Unit regression and combined browser checks pass, including swipes within and below the panel. |
| 76 | Typing zoom is too close; provide a tunable slider in Settings. | Implemented a 10–22px typing display-size slider, default12px, persisted per browser. Browser slider, persistence and applied zoom verified. |
| 77 | Closing the keyboard should restore global view by default; allow disabling it. | Enabled-by-default return-to-full-view setting. Native three-cycle dismissal restores overview. Actual browser touch enlarges the terminal manually before simulated keyboard close, then verifies full grid/no overflow. Physical-device acceptance remains open. |
| 78 | Add draggable viewport-relative Floating functions, independent of page zoom/scroll. Hold reveals three configurable branches pointing away from the nearest two view edges. Defaults: reset to maximum/global view, most-used shortcut, copy highlight. Configure in Settings. | Original interaction superseded by85; reset interpretation superseded by86. Current control retains three configurable inward functions, viewport position, most-used delivered shortcut and native highlight copy. Browser/event checks pass; physical Safari pinch/hold remains open. |
| 79 | Ctrl-C should send immediately, with optional confirmation disabled by default. | Implemented centrally: immediate Ctrl-C by default, optional confirmation persisted in Settings. Modifier+C, shortcut buttons and configured floating keys share delivery. Automated immediate-delivery and opt-in cancellation checks pass; fresh real-cmux touch confirms immediate interruption and following command execution. |
| 80 | Cursor remains offset after the first fix. | Reproduced mixed-font cell-width drift and cursor row drift after 4005 history rows. Graphemes now occupy authoritative cell widths; cursor belongs to its rendered row. Browser checks verify shared columns and cursor alignment in both views and long scrollback. Latest physical iPhone report remains acceptance-open. |
| 81 | Shortcut strip disappears after keyboard dismissal and second engagement. | Keyboard baseline survives repeated viewport cycles, independently of PRE focus events. Regression/browser checks and three native iPhone13ProMax Safari dismissal/reengagement cycles show the rail every time. Physical-device acceptance remains open. |

## Floating-control and input regressions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 82 | Typed input remains absent or invisible (teal marking, photo1). | Native Safari reproduced one disappearance mechanism twice: Paste and the following letter reached the server, but an active highlight froze DOM painting until another terminal tap. Committed terminal actions now end selection without moving focus. Paste and following-letter native checks passed twice; final selected Backspace, Ctrl-X→plain typing and reading-shortcut focus replay also passed in INTERACTIVE_IOS_REPORT.md. The tiny wrong-size glyph variant90/98 remains open. |
| 83 | Floating control is far from the thumb during dragging, especially pinched (red marking, photo1). | Reproduced Safari visual-origin rectangle versus layout-origin control coordinates at scale2 with nonzero viewport offsets. Pointer origin now comes from the control's own position and preserves the grab offset. Regression fails before and passes after; physical iPhone pinch acceptance remains open. |
| 84 | Expanded floating panel has overflowing labels, no active-action highlight and weak layout (photo2). | Implemented bounded pill labels, active fill/border/halo. Separate caption subsequently removed by89. Browser verifies readable labels and target preview; event tests cover all corners and reduced390×300 action bounds. Current proof: proof-floating-v2.jpg. |
| 85 | Hold should move the handle; ordinary drag should open/select an action. | Implemented: hold locks reposition mode; ordinary drag opens branches, highlights the release target and activates on release. Returning to center cancels. Event regressions pass; actual browser drag delivers exactly one Backspace without moving the handle. Native iPhone hold remains acceptance-open. |
| 86 | “Fit” is not the requested reset zoom; reset should set zoom to maximum. | Earlier largest-text interpretation was wrong and is superseded by92: reset fits the complete terminal, fully zoomed out, without changing saved typing size. |

## App identity — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 87 | Give Pokemux a better icon suited to its name. | Original request delivered, then rejected in88 for Pokémon resemblance. Replacement tracked in88; all identity surfaces must share the new asset. |

## Icon correction — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 88 | Pokemux is not about Pokémon. Do not copy Pokémon imagery. | Replace the rejected capture-orb icon with an original pocket-and-terminal identity. No red/white ball, central band, mascot or franchise reference. Applied original mint pocket outline with stacked terminal tabs and ivory prompt on navy; all app identity surfaces use the shared new asset. Small-size visual check passes; private HTTPS serves the identical180px source asset. |

## Floating feedback correction — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 89 | Remove the separate display naming the floating action to activate; the highlight is sufficient. | Removed caption markup, styling and positioning logic; active button styling and aria-pressed remain. Regression failed before and passes after; combined browser verifies highlight-only drag/release, exactly one delivery and action bounds. |

## Typing, gesture and full-view regressions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 90 | Typed text has the wrong size and offset until zoom changes (photo1). | Open for the photographed tiny/raised glyph variant. Native Safari short ASCII, Powerline selection/paste and repeated keyboard cycles did not reproduce that shape. A separate frozen-echo failure82 was reproduced and repaired. Terminal scaling now uses a transform on a bounded canvas, keeping the editable layout font16px; native12px display-size focus checks no longer zoom the whole page. This is not proof that the original tiny glyph failure is fixed. |
| 91 | Left/right swipe broken again. | Actual browser touch reproduced a stale dialog swipe flag swallowing the first action after reopening; clear that flag at dialog opening. Touch checks now pass reading sidebar/shortcuts swipes, panel-only dismissal, zero accidental keys, first reopened key delivery and typing Left/Right. A later selection fix also moved reading focus into PRE; before BUTTON→PRE, after selection clearing preserves focus, and the complete touch sequence passes. Native fast swipe remains unsupported by the current actuator. |
| 92 | Reset zoom does not work (photo2). | Actual browser two-finger pinch reproduced page scale2 remaining after the former local-only Reset. Pinch now changes terminal canvas scale while app chrome stays at page scale1. Reset clears manual terminal scale/scroll, fits every column, retains header at top0, and preserves full view through fresh output and keyboard changes. Regression and actual touch checks pass; physical iPhone acceptance remains open. |
| 93 | Pinching cannot reach maximum zoom-out and leaves scrollbars (photo2). | Actual two-finger touch paths now zoom terminal content back to the minimum full-grid scale without horizontal overflow. Pinch uses terminal coordinates; page chrome remains scale1. Keyboard close clears manual scale when automatic overview restore is enabled. Actual browser touch passes; native UIKit multitouch is not available through the controller. |

## Keyboard-relative shortcut rail — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 94 | Shortcut strip must stay at the visible keyboard/view bottom, not the zoomed page; current rail is misplaced/offscreen (photo). | Rail occupies a separate visual viewport layer and terminal layout reserves its height. Actual browser pinch preserves rail bottom430 and its size in a reduced view. Native iPhone13ProMax Safari three dismissal/engagement cycles show the rail each time with the cursor above it. Safari address/form chrome is outside the web viewport; Home Screen launch removes address/navigation chrome. |

## Interactive acceptance canaries — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 95 | Independent interactive user agents should explore the UI instead of leaving user testing to Joy. | Independent native tester used iPhone13ProMax/iOS26.3.1 Safari, actual onscreen keys and native double-tap selection menus. It found focus-autozoom and pasted-input frozen display; original sequences were rerun after repair. Independent audit found a key-action selection sibling and weak geometry assertions; coverage corrected. Reports distinguish verified behavior from unsupported gestures and the unreproduced tiny text shape. |
| 96 | Use finger gesture primitives and codify repeatable canaries. | Twelve canonical recipes remain in tests/touch-canaries.json. tests/browser-touch-canaries.mjs codifies actual CDP touchStart/move/end and multitouch paths, with server delivery and rendered geometry assertions. Native Simulator taps/double-taps/onscreen keyboard are independently recorded. Native timed hold, fast swipe and multitouch are not claimed by the browser input-engine run. |

## Whole-page reset regression — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 97 | Reset still leaves the Pokemux header offscreen; both18:23 screenshots show the whole page enlarged/panned. | Actual browser page-pinch-before/reset sequence reproduced missing-header cause: page scale2/pan survived Reset. Terminal-owned pinch and an unscaled editable layout now keep chrome/page scale1. Native focus at12px display size previously enlarged the header; three cycles after transform-canvas repair keep header stable. Actual browser Reset returns header top0/fullwidth/no horizontal scroll. Native pinch and physical-device confirmation remain open. |
| 98 | Reminder: misplaced input text is still not fixed. | The photographed tiny misplaced input variant90 remains open. Native testing repaired the separate selected-input frozen-echo class82; neither rail nor gesture passes are substituted for the original rendering failure. |
| 99 | Test using the iPhone13ProMax browser layout instead of relying on a generic mobile viewport. | Executed canonical428×926 iPhone13ProMax browser baseline, landscape926×428 and narrower fit checks. Native Safari ran on an actual iPhone13ProMax Simulator. User-created fork restored same-origin browser access; original permission records were not edited and no alternate port was used. Eight combined browser checks passed2026-10-10T13:29:27Z; actual touch receipt is separate. |

## Requirements retained

- cmux window → grouped workspace → named tabs, preserving underlying pane identities.
- Termius-style compact shortcut groups and an extended panel.
- Private Tailscale access, with your accepted passkey choice for production.
- No terminal input is accepted before authenticated owner setup and an established live mirror. Existing terminals are never automated test fixtures.

## Evidence

- [EXECUTION.md](EXECUTION.md) is the current work receipt. Earlier screenshot and result files retain their capture-time scope.
- [state/cmux-current-suite.log](state/cmux-current-suite.log):93 passing regressions, zero failures. Bug fixes retain failing-before evidence in the plan and native report.
- [BROWSER_KEYBOARD_RESULT.json](BROWSER_KEYBOARD_RESULT.json): current combined custom-keyboard touch acceptance; the receipt records source hashes, actual contacts and observed delivery. Synthetic streamed output; no cmux or UIKit claim.
- [BROWSER_CUSTOMIZATION_RESULT.json](BROWSER_CUSTOMIZATION_RESULT.json): four actual-UI customization checks cover edited/deleted snippets, ten-shortcut enforcement and rail ordering after reload; form text uses locator entry after touch.
- [INTERACTIVE_IOS_REPORT.md](INTERACTIVE_IOS_REPORT.md): native iPhone13ProMax/iOS26.3.1 Safari and Home Screen observations, font control and before/after results. Unsupported touch primitives remain explicit.
- [tests/touch-canaries.json](tests/touch-canaries.json), [tests/TOUCH_CANARIES.md](tests/TOUCH_CANARIES.md), [tests/browser-keyboard-canaries.mjs](tests/browser-keyboard-canaries.mjs):23 repeatable task recipes and the canonical combined actual-touch runner.
- [BROWSER_CMUX_CURRENT_RESULT.json](BROWSER_CMUX_CURRENT_RESULT.json):seven current real-cmux actual-touch checks. [CMUX_TEST_RESULT.json](CMUX_TEST_RESULT.json):11 fresh adapter checks after the bridge fix. [BROWSER_TEST_RESULT.json](BROWSER_TEST_RESULT.json) retains12 historical checks.
- [BROWSER_FIXTURE_CLEANUP.json](BROWSER_FIXTURE_CLEANUP.json): current owned fixture removed and existing workspace state unchanged. Historical automatic-title failure remains in the plan; current passing evidence does not erase it.
- Private Tailscale service remains active with the existing passkey. Assets are read fresh on reload. Tested bridge replay wake/socket-error changes are active; current deployment and cleanup details are in EXECUTION.md.

Original tiny/raised native input90/98, physical typing acceptance, native duration-controlled hold/multitouch, physical-iPhone acceptance and live groups/notifications remain separate acceptance gates. Custom input avoids native editing for typing; passing synthetic echo does not prove the original physical failure resolved.

User authorization to create a fresh cmux workspace was executed under item130. Current real-cmux acceptance and cleanup pass; no existing terminal received input or rename, and cmux source/settings were not modified. Stock global title flushing remains an external side effect to check on every fixture cleanup.

## Native deletion, compact chrome and mobile sizing — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 100 | Holding native Backspace stops deleting after a couple characters; it should continue. | Partly open: native repeated deletion and delete-past-empty→typing pass after the caret fix in104. Sustained hold remains unverified: documented native actuator has no duration-controlled press; its drag emits one Backspace. Repeated taps do not certify held repeat. |
| 101 | Remove the repeated workspace name and move tab navigation up. | Implemented: tabs and one44px app-menu target share a46px top row, reclaiming53px from the previous99px heading+tabs. Workspace identity remains in sidebar/accessibility. Rendered canary failed before and passes after; native Safari current acceptance passed. Current actual touch replay passed twice: tab reorder persists without active-terminal change; blank-rail and tab-origin pull cancel correctly; release reloads one document. |
| 102 | Remove the middle strip above the keyboard that wastes vertical space. | OS boundary verified in native Safari and Home Screen mode: arrows/checkmark strip remains in both. Home Screen removes the Safari address/navigation bar and places the app rail directly above the native strip. WebKit creates the contenteditable accessory view in native host code; no supported page control to remove it. Screenshots native13-standalone-{reading,keyboard}.png; retain native input/selection/paste. |
| 103 | Put the bottom language switch inside the123/ABC switch to reclaim keyboard space. | OS boundary: the globe and123/ABC keys belong to the native iOS keyboard, whose layout the web page cannot rearrange. Retain native typing/selection/paste; no custom keyboard added. Apple keyboard guidance and native Simulator UI verified. |
| 104 | After deleting text, typing can get stuck with no visible text or cursor movement. | Fixed and native replay passed: empty Backspace removed Safari insertion caret; unchanged terminal output emits no frame, so the next letter never reached the server. Preserve collapsed caret on committed actions; end only actual highlights. Regression failed before/passes after, plus native empty/past-empty deletion, no-op Left/Ctrl-X, selection/paste and three keyboard cycles. See INTERACTIVE_IOS_REPORT.md and native13-delete-noop-{then-type,fixed}.png. |
| 105 | Can cmux render a mobile-sized terminal independently without changing the Mac view? | Verified: viewport_columns/viewport_rows on terminal replay resize the existing shared Ghostty surface via applyMobileViewportLimit→applySurfaceSize→ghostty_surface_set_size; native iOS consumes the returned common grid. They do not request an independent mobile render. Local scale/scroll leaves Mac geometry untouched; independent mobile reflow is unavailable through this API. No cmux geometry changed. |

Current 100–105 acceptance: native no-op deletion failure captured before and after; all supported native input paths pass. Browser combined nine checks and actual touch twice14:29:52Z/14:30:11Z pass with compact header. Continuous native Backspace remains open. Home Screen testing covers the owned Simulator only. Existing cmux workspaces were not mutated.

Final native Safari replay on source7e5d80bf: empty Backspace→a, abc→five deletes→d, native Paste→q and three keyboard engagements pass. Exact server actions match once each. [Final native proof](native13-final-current-keyboard.png); [report](INTERACTIVE_IOS_REPORT.md). Owned fixture/browser/Simulator cleaned; live4388 retained.


## Rapid typing and cursor navigation — current request

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 106 | Fast typing can get stuck with no further key reaction. | Reproduced against real cmux: a60-key burst stopped after13 burst characters because each input called rate-limited system.tree. Target validation now calls live surface.health, outside the snapshot bucket. Regression fails before/passes after; actual64-key burst at15.8chars/s reaches only the owned terminal exactly once and paints. Original physical-iPhone acceptance remains separate. |
| 107 | Landscape should not force the sidebar to stay open. | Fixed layout: at926×428 the closed sidebar consumed292px before; now it is offscreen and content uses926px. CSS and gesture/inert breakpoints agree. Current actual touch replay passed twice at926×428: drawer remains closed until a gesture opens it. |
| 108 | Remove default arrow shortcuts; add a separate draggable joystick with immediate directional keys, farther horizontal word jumps, vertical arrows and modifiers. | Verified twice through actual browser touch: distinct cursor control; hold to reposition without sending, deflect to send and repeat before release, center/release stops, farther horizontal sends Alt-Left/Right word navigation and vertical stays arrows. Modifiers persist throughout the gesture and clear after use. Native timed joystick movement remains unverified. |
| 109 | Remove Home through PageDown from default shortcuts. | Implemented and regression verified: removed both default navigation groups, including old saved default ordering; other ordering and custom Home/arrow shortcuts remain. Full shortcut panel retains deliberate access. |
| 110 | Avoid constant zoom adjustment; research independently sized cmux rendering or make default/reset readable, with the best scroll UX when overflow is unavoidable. | Implemented and runtime verified: one saved readable Text size across reading/typing/reset. Native keyboard cycles retain it; browser pinch/reset/restore passed twice. Shared cmux PTY cannot independently reflow for mobile through the current API; native iOS also locally scales the common grid. Manual pan/pinch remains available. Supersedes earlier reset-to-full-grid target;111 removes horizontal following. |

| 111 | Stop automatically panning horizontally to keep the right end of input visible. | Fixed in native replay: before75 typed characters panned the left edge offscreen despite vertical-only JS scrolling. When the remote cursor is horizontally outside view, keep the invisible native editing caret on the input row inside the viewport; leave authoritative output/cursor unchanged. After72 letters preserve the left edge, native Copy/Paste→typing paints immediately and three keyboard engagements pass. JS regression failed before/passes after. Manual pan/pinch remains available. |

| 112 | A single terminal tap should engage the keyboard; currently several taps are needed. | Native trace reproduced pointerdown/up without Safari compatibility click. Recognize a short stationary pointer tap directly; keep click/accessibility activation, long-press selection and swipe arbitration. Regression failed before/passes after; native367d first-tap-after-dismissal passed. Tap-lifetime rejection covers secondary contacts and drag/pinch; final native5f541 replay and repeated browser touch pass. |
| 113 | Keyboard engaged by default; dismissal is a deliberate reading mode. | Implemented startup and terminal-navigation focus. Native367d Safari Reload actually opened the keyboard without a terminal tap. Cold startup remains subject to WebKit user activation; the rail is hidden if no keyboard opens. Deliberate dismissal enters reading mode. |

| 114 | Replace the native iOS keyboard with a well-emulated custom keyboard to remove its accessory strip. | Implemented and verified: custom terminal keyboard is default, with optional system keyboard in Settings. Actual synthetic touch covers60-character burst, held deletion, following echo, Shift/Caps/modifiers/symbol layers and concurrent contacts. Native Safari/Home Screen avoid the OS keyboard/accessory strip in custom mode; final Japanese/native replay recorded in EXECUTION.md. |

| 115 | Horizontal scrolling keeps breaking left/right terminal gestures; move sidebar opening to a right swipe on the navigation bar. | Superseded by117/118. Terminal horizontal gestures now pan only; no sidebar/keys swipe competes with terminal scrolling. |
| 116 | Swipe up from shortcut strip to expand it, integrated above the keyboard rather than a separate panel at top. | Verified through actual touch: rail-up expands keys directly above the custom keyboard, reserves terminal space, and delivers each chosen key once. Scrolling down preserves the panel; returning to its top collapses it. Landscape replaces alphabet keys while expanded. |

| 117 | Correction: RIGHT swipe on nav bar opens sidebar. | Superseded immediately by118; retained as requested ledger history. |
| 118 | Remove navigation swipes; use a left-side icon button to open sidebar. | Verified: left-side44px icon opens sidebar. Navigation swipes scroll overflowing tabs; terminal swipes only pan. Drawer remains closed after landscape rotation. |

| 119 | Tab navigation must slide when tabs overflow the screen. | Verified actual bidirectional overflow drag at320px without selecting/reordering/opening sidebar; held reorder persists after reload. |
| 120 | Display a maximum24 characters per tab name, then ellipsis. | Verified visible labels capped24 Unicode codepoints plus ellipsis, with full title retained. |
| 121 | Holding a tab should offer moving it left/right as well as rename. | Verified long hold opens Rename / Move left / Move right, edge movement disabled; held drag and menu movement share persistent tab ordering. |

| 122 | Sidebar search should also match tab names and on-screen text if inexpensive. | Verified sidebar search matches tab names and cached streamed terminal text, opens matching tab and sends no terminal input. No extra cmux reads; unvisited output is not fetched. |
| 123 | After UI requests, measure input-to-display delay and optimize substantially. | Implemented measured renderer and bridge improvements.4000-row apply+paint median199ms→36ms in Node/JSDOM CPU benchmark; unchanged rows retained, linear history ingestion. Input omits unrelated group RPCs, uses live surface.health membership validation instead of a full tree per key, and wakes matching replay immediately. Real-cmux touch-to-observed-echo samples101–127ms include actuator/observation overhead. Physical-phone/network latency remains unmeasured; details are in EXECUTION.md. |

| 124 | Scrolling to the top of expanded shortcut keys should collapse the panel. | Verified actual panel overflow scrolling: scrolling down keeps it expanded; returning to scrollTop0 collapses without sending a key. |
| 125 | Default Ctrl-C group should use Ctrl-W instead of Ctrl-D. | Verified default Ctrl-W reachable by rail scrolling and delivered once. Exact old default group migrates; custom groups remain. |
| 126 | Raise keyboard slightly and let floating controls occupy the space underneath. | Verified52px internal shelf under custom key area accepts both controls through stationary hold then drag without terminal input. Native Safari and Home Screen geometry consume safe-area once and reserve keyboard size after late resize. Landscape alphabet keys compact to preserve terminal height. |
| 127 | Replace keyboard Paste with language switch; floating Paste replaces Copy. | Verified keyboard Language selector replaces Paste. Floating Paste highlights its branch, returning to center cancels, release delivers once to its captured target. Optional system-keyboard mode retains native highlight Copy; custom-mode native selection remains unverified. |
| 128 | Replace Zoom reset with Zoom Toggle between full view and typing size. | Verified pinch plus Zoom Toggle: first toggle fits all columns and clears horizontal offset; second returns saved readable size. Header and controls remain fixed. Keyboard-close restore respects its setting. |
| 129 | Japanese romaji support, as the final task, verified through real interaction. | Implemented as the last functional job: offline hiragana/katakana romaji preedit; first Space/Enter commits without submitting, subsequent Enter sends Enter. Esc cancels, held deletion stays local past empty, shortcuts remain literal, and target/language/disconnection changes discard preedit. Integration regressions pass; final actual touch/native acceptance recorded in EXECUTION.md. Kanji/dictation use optional system keyboard. |

| 130 | Test real cmux by creating a new workspace, without touching existing ones. | Passed: fresh11-check adapter run and seven combined actual-touch checks with all current code active. Actual UI caught/fixed snapshot-budget exhaustion106 and stale compatibility clicks reopening the dismissed keyboard.64-key burst, held Backspace/retyping, isolated tabs, real zsh execution/cursor, three keyboard cycles and Japanese pass. Owned fixtures removed; existing IDs/titles/order/selection unchanged. Tested bridge activated on4388; passkey/HTTPS verified. Evidence: BROWSER_CMUX_CURRENT_RESULT.json, CMUX_TEST_RESULT.json, BROWSER_FIXTURE_CLEANUP.json. |

Historical count correction: the synthetic keyboard runner used60 burst characters; its earlier receipt label incorrectly said64. The runner now derives the label from the actual input length. The current real-cmux runner sends and verifies64 characters.

## Mobile follow-up — 2026-10-11

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 131 | Keep tab controls open after Move left/right. | Verified actual touch: Move left and Move right retain the same visible modal; modal ownership no longer changes during redraw. |
| 132 | Add Close tab to the same control modal. | Verified actual touch: hold tab, Move left/right retains modal, Close removes only the owned second tab; first and shell tabs remain. |
| 133 | Prompt characters render as boxes although correct on Mac. | Bundled terminal font supplies known Powerline private-use glyphs; cmap/asset tests and Chrome rendering pass. Native Powerline visual acceptance remains open. |
| 134 | Floating functions handle must be a real unselectable icon. | SVG handle is unselectable and all floating control descendants disable text selection; actual touch function access passes. |
| 135 | Paste fails with browser permission/context error. | Trusted browser Paste sends exact bracketed UTF-8 once. Native Safari denied-permission route opens explicit native paste field; actual native Paste delivers exact bracketed text without Return. |
| 136 | Last-used shortcut/function does not update in floating control. | Verified actual touch: Ctrl-A then Ctrl-E updates the floating recent action; repeat delivers bytes01,05,05. |
| 137 | Separate modifiers and nonmodifier shortcuts into compact rows in strip and panel. | Original separation implemented, then superseded by155: one packed configurable grid removes the empty modifier-row space. Modifier state remains distinct through highlighting. |
| 138 | Larger shortcut icons; remove keyboard duplicates; Home–Ins/arrows last. | Keyboard duplicates removed and navigation catalogue placed last. Official Shift/Caps artwork added under150;153 standardizes compact icon dimensions and margins. |
| 139 | Finger-tracked cancellable pull-up expansion and downward stow at scroll top; control inertia. | Verified actual finger paths: intermediate100→186px expansion, reversal cancels, release expands, deliberate downward pull at scroll top stows. |
| 140 | Avoid stream interruption each time app is backgrounded. | Hidden-page work pauses and visible/page-show re-establishes authoritative stream. iOS may suspend background web apps; browser cannot guarantee continuous background execution. |
| 141 | Disconnected stream must not block UI scrolling, expansion or dismissal. | Verified actual offline UI: sidebar/menu/shortcut expansion and dismissal remain interactive while terminal input is blocked; reconnect restores action availability. |
| 142 | Provide top-right menu switch from System to Pokemux keyboard. | Verified native Safari: System→menu restores Pokemux keys and removes native keyboard/accessory; exact deployed hotfix and combined build recorded separately. |
| 143 | Add fourth floating function for switching to Pokemux keyboard. | Verified native Safari: System→fourth floating function restores Pokemux keys and removes native keyboard/accessory. |
| 144 | Left/right swipes in expanded shortcut panel switch its tabs. | Verified actual touch: horizontal panel swipes traverse Keys→Snippets→Customize and back; first key sends once. |
| 145 | Commit baseline and run parallel agents in isolated worktrees. | Done: verified baseline042be62 committed; three worker branches/worktrees plus root integration worktree. No push/publication. |

| 146 | Replace default shortcut groups: Esc/Tab/Ctrl/Alt/Shift/Del; Ctrl+C/A/E/W/L/R; up to4 hard-to-find coding characters. Remove1/2/3/Enter group. | Implemented exact defaults: Esc/Tab/Ctrl/Alt/Shift/Del; Ctrl+C/A/E/W/L/R; pipe/backslash/backtick/tilde. Number/Enter group removed. |
| 147 | Use Mac key icons wherever available. | Mac key symbols used with full accessible names; shared official licensed Shift/Caps SVG source. |

| 148 | Investigate replacing sidebar/menu buttons with linear cancellable left/right edge drawers and opacity curve. | Actual Chrome edge paths pass partial preview/reversal/release/dismissal and preserve canceled shortcut panel. Native Safari edge arbitration remains unverified; browser launcher buttons retained. |
| 149 | Prioritize keyboard return so the user can review keyboard UI. | Priority keyboard hotfix was deployed first; final combined build passes native and Chrome menu/fourth-function return routes. |

| 150 | Replace distorted thin Shift/Caps arrow with a proper icon and distinct Caps Lock state. | Official licensed Lucide Shift/Caps SVG replaces thin hand-rolled arrow; actual native Shift/Caps screenshots pass. Regression verifies delivered uppercase/lowercase. |

| 151 | Use a language popover beside the language key, keeping keyboard and terminal visible; dismiss outside. | Verified same-source Chrome and native Safari: compact language popover stays open after release, dismisses by second touch/outside/Escape and preserves terminal/keyboard geometry. Focused-terminal hardware input remains owned by the chooser. |

| 152 | Joystick far-left inserts repeated b and highlights the opposite direction. Word movement must send navigation, and only the active direction may glow. | Verified actual finger drag and stock cmux: far left/right send repeated ESCb/ESCf with no bare letters, stop on release, highlight only active side and retain combined modifiers. Actual zsh insertion after word-left yields one two xthree. |

| 153 | Shortcut icons have inconsistent sizing, alignment and margins; Escape is oversized and unclear. Use compact Mac key symbols consistently across strip and expanded panel. | Verified: shared52×36px cells,18px icons and2px gaps in strip/panel; centered bounded content. Esc uses its recognizable label. Original inconsistent dimensions reproduced and retained in before screenshots; long custom names ellipsize without overflow. |
| 154 | Review UI aesthetics on every UI change, including icon recognition, optical alignment, margins and real phone screenshots. | Done: mandatory visual acceptance in DESIGN.md and tests/TOUCH_CANARIES.md. Fresh428×926 and320×812 default/expanded reviews, armed state and native Safari screenshots. Review also caught and repaired the clipped close-button focus outline; independent audit passed. |
| 155 | Remove empty upper-right shortcut space; configure row count, default2. Both rows must scroll horizontally by the same left-swipe gesture. | Verified actual finger paths: both rows scroll the same packed grid without accidental input. Settings→Shortcut rows offers1/2/3, default2; persistence and dock/terminal height verified across reloads. Seven density checks and seven real-cmux checks pass on the same final source. |

| 156 | Propose five distinct Pokemux icons based on its meaning/purpose, excluding the current design and Pokémon references. | Superseded: user rejected the literal concepts. Current abstract parity proposals and prompts are in design/icon-concepts-v6; installed app icon unchanged pending selection. |

| 157 | App icon must be abstract and minimal: no clear characters, fine lines or literal objects. | Five new parity concepts generated in design/icon-concepts-v6; proposals only. Prior literal and arbitrary-abstract sets rejected. |
| 158 | Holding arrow control while another finger moves terminal should pan, not zoom. | Verified: actual held joystick plus second-finger pan preserves scale and moves both axes; genuine two-terminal-finger pinch remains functional. Regression failed before/pass after; repeatable canary records exact paths. |
| 159 | Expanded shortcuts must extend the strip seamlessly, without side waste or losing key positions; redesign horizontal category swiping accordingly. | Verified: original strip stays visible with unchanged key positions/scroll offset; additional keys extend upward using shared cell widths and4px insets. Category gestures stay on category bar. Pull preview/reversal/stow and real shortcut delivery pass. |
| 160 | Floating shortcut handle looks like fullscreen and is misaligned. Use an appropriate shortcut icon with optical centering. | Verified: licensed Lucide Command glyph replaces fullscreen brackets; grid centering removes the observed1.77px baseline offset. Default/expanded screenshots reviewed, bounded branches and320/428px layouts checked. |
| 161 | Brand meaning: mirrored phone control of desktop cmux agents over private Tailscale, equal remote capability, independence from vendor remote services. | Five reduced parity/reflection/continuity proposals generated; installed app icon unchanged. |

| 162 | Real E2E found stock cmux rejects F-key names, Insert and modified editing/navigation key names exposed by the shortcut panel. | Fixed at Pokemux server serialization: direct standard terminal sequences through terminal.input for unsupported families, native named-key delivery for other keys. Failing-before regression and real Control-F1 exact bytes verified; no cmux modification. |
