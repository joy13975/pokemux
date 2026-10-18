# Pokemux — review ledger

This is the authoritative checklist of all feedback entries. Repeated reports and superseded instructions remain visible. Pokemux uses its own passkeys and stock cmux's local API. This fork restored browser access at the same approved origin. Independent native Safari testing reproduced focus-induced page zoom, selected-paste frozen output and no-op deletion losing the insertion caret; fixes and their evidence are below. Browser touch checks cover actual input-engine gestures, not dispatched DOM events. The photographed tiny offset text remains open; no synthetic pass establishes that specific fix.

1. Explain confusing controls.
   Delivered the previous screenshot’s control-by-control explanation. Current UI removes the redundant controls instead of adding more explanation.

2. More terminal space; minimal UI.
    Current space/layout behavior is tracked in101,114,153,155 and159. The strip stays visible as the panel extends upward; earlier hidden-strip behavior is superseded by159.

3. Dark mode by default.
   Browser verified in the previous revision. Retained throughout output, sidebar, sheets, and native controls.

4. Why distinguish Compose and Terminal?
   Explained direct keystrokes versus a local editable draft. Superseded by item 26: Compose is now removed entirely.

5. No default submit button.
   Implemented: no submit button or draft editor in the default interface. Compose has been removed by item 26.

6. No visible text field for direct input; tap terminal to type.
    Tap the terminal to engage direct input. Default custom keyboard behavior follows112–114. Terminal selection and native editing-menu access are restored under172, with inputmode=none preventing the system keyboard.

7. Small opt-in Compose icon; textarea appears only when on.
   Superseded by item 26: remove Compose and its pencil toggle entirely.

8. Keys button crowds shortcut rail.
    Crowded Keys button removed. Shortcut access is now the integrated pull-up strip/panel under116,139 and159.

9. Remove “Needs input” banner.
    Banner removed. Audit reproduced discarded cmux unread notifications;171 restores real orange indicators on target tabs/workspaces/group anchors and clears them when read.

10. One top-right menu, not three.
    Implemented: one top-right menu. Later refinements in items 39–41 and 45–46 remove redundant actions and move workspace operations into the sidebar.

11. Draggable tabs.
    Browser verified: drag visibly reorders the phone tab strip and persists across reload. A reproduced bug moved tabs between cmux panes; the fix preserves pane IDs, membership and the active input target. Handler regression failed before and passes after; rendered ordering/reload checks pass.

12. Swipe right opens left sidebar.
    Opening is superseded by148: cancellable edge drawers, with browser button fallback under118. Terminal gestures pan under115.

13. Swipe left opens keys panel.
    Superseded by116: swipe UP on shortcut rail expands integrated panel above keyboard; terminal horizontal gestures only pan.

14. Remove sidebar “Ready…” / “Waiting…” status text.
    Browser verified: description/status paragraphs removed. Small state indicators retain accessible labels.

15. Keep a complete review ledger.
    Reconciled all original and later requests, including your latest instruction to log every request. Repeated ledger reminders also remain in items 31 and 51. This file is served privately and available from App menu → Review changes.

16. Fuller screen on iOS.
    Added Home Screen web-app metadata, manifest, and icon. Safari → Share → Add to Home Screen → Open as Web App → Add, then launch the icon. This requires an action on your iPhone; a website cannot perform it itself. Owned iPhone13ProMax Simulator Home Screen launch and native keyboard check passed; physical launch remains pending.

17. Remove fat gap below controls when keyboard opens.
    Default custom keyboard geometry follows114/126 and has no OS form-accessory strip. Optional System keyboard retains browser-owned accessory chrome.

18. Dismiss every modal by tapping outside.
    Browser verified for the shared modal backdrop and nonmodal shortcuts dropdown. Taps inside remain active.

19. Split creation / switching do not work or are unclear.
    Superseded by items 38 and 45: no split creation or Switch terminal action. All existing terminal tabs appear in one workspace strip, and one terminal fills the display. Original reproduced failures were a nonfunctional phone layout toggle and a 273 px secondary terminal in a 390 px viewport.

20. Keyboard must reveal shortcuts and the active input line.
    Browser reduced-height checks and three native iPhone13ProMax Safari keyboard engagements show the shortcut rail each time and keep the authoritative cursor/input above it. Physical-device acceptance remains open.

21. Remove unnecessary icons in tabs.
    Browser verified: no terminal/file/browser tab prefixes; names and compact state indicators remain.

22. Text selection while the keyboard is showing.
    Native custom-mode double-tap selection, Copy, Paste and subsequent typing now pass under172. Duration-controlled long hold remains a separate unavailable native actuator.

23. Paste into terminal.
    Current trusted Paste and permission-denied native route follow127/135. Direct native editing-menu access in default custom mode is restored and verified under172.

24. Remove unnecessary workspace-group icons; show hierarchy clearly.
    Browser verified: plain group headings, indented children and a hierarchy line; folder and group-plus icons removed.

25. Organize menu and remove useless actions.
    Static sections retained. Later tab controls follow121/131/132; menu keyboard return follows142. Removed redundant terminal/workspace actions stay removed.

26. Remove Compose entirely; direct terminal input must be sufficient.
    Compose remains removed. Direct input follows112–114, with native selection/paste restored under172.

27. One user-defined custom shortcut group, up to 10 shortcuts.
    Browser verified: create/edit/delete/execute and persistence, ten-item limit and disabled eleventh item. Agent-created shortcut fixtures removed. Named label/chord layout verified in Customize.

28. User-defined snippets.
    Browser verified: multiline snippet creation, persistence and literal insertion without Enter; editing and confirmed deletion passed. Removed the hardcoded sample snippets and agent-created test fixture.

29. Left-swipe keys panel drops from the top, leaving terminal visible.
    Top placement superseded by116/159. The panel now extends upward from the retained shortcut strip; progressive pull and cancellation follow139.

30. Drag-down refresh activates only from the top bar.
    Implemented page reload restricted to a pull starting on the top bar. The visible, release-only, reversible gesture is tracked in item 43.

31. Keep updating the ledger as feedback arrives.
    Updated through all requests in the visible conversation, including zoom, full-ledger reconciliation and intent-led class-level design. Superseded instructions and outstanding physical-iPhone checks remain explicit.

32. Pull-down refresh means reload the entire web page.
    Actual browser touch records exactly one Document request after an armed header release and none after returning before release or dragging terminal output. Handler tests also cover cancellation and diagonal disarming. Changed terminal replay snapshots arrive independently over SSE. Native pull gesture remains unverified.

33. Clicking a workspace group changes its name but not its tabs.
    Current real-cmux group test passes: selecting a member shows its own tabs; tapping its group header selects the anchor and restores the anchor tabs. BROWSER_METADATA_RESULT.json records owned identities and actual touches.

34. Paste must be available through terminal long hold or double tap.
    Default-custom native double-tap opens Copy/Paste; Copy of RECV and native Paste plus custom q deliver exact bytes under172. Timed long hold remains unverified by the current native actuator.

35. Long hold must select terminal output while the keyboard is showing.
    Native custom-mode selection/Copy/Paste is verified under172; streaming defers during active selection. Duration-controlled hold and selection-handle dragging remain unsupported by the native controller.

36. Separate custom shortcut name from its content.
    Browser verified: custom shortcut row separates its name and chord with spacing and a middle dot. Native accessible name also includes the separator.

37. Remove customization space waste and hidden group-ordering UI.
    Browser verified: customization uses available space without a fixed blank filler; toolbar group order appears directly after shortcut controls. Ordering survives reload; scroll cue appears only when more content exists.

38. Rename the app Pokemux and remove terminal split creation.
    Pokemux naming, manifest and icon implemented; split creation, multi-pane display and orphaned controls removed. Browser verified: all existing sample tabs, including tabs from another pane, are reachable in one strip. Original pane membership is preserved.

39. Remove View scrollback, Current screen, and Paste into terminal menu entries.
    Requested top-menu entries remain removed. Contextual native paste follows127/135/172; no top-menu Paste entry is restored.

40. Workspace actions belong in the sidebar, not the top-right menu.
    Implemented: workspace operations are only in sidebar row actions. Top-right menu contains Terminal / App sections.

41. Use plain menu sections; remove expand/collapse controls.
    Implemented static section headings without disclosure controls.

42. Finish every ledger item, connect real cmux, and test extensively only on new workspaces/tabs.
    Fresh real-cmux acceptance now passes on newly created owned workspaces: 11 adapter checks and seven combined actual-touch checks, with all current code active. Cleanup confirms existing identities, names, order and selection unchanged. An earlier cleanup detected a stock automatic-title flush; that historical failure remains recorded. No existing-terminal input or rename occurred. Physical-device and original tiny-text acceptance gaps remain explicit below.

43. Standard visible pull-to-refresh, with cancellation when dragged back before release.
    Actual touch verifies page displacement, visible Release to refresh feedback, return-before-release cancellation and exactly one whole-document reload on armed release. Handler regressions also cover short pulls and OS cancellation. Native/physical gesture acceptance remains open.

44. Left/right swipes stopped working.
    Earlier terminal-swipe behavior is superseded by115–118. Current edge drawers follow148; shortcut category gestures follow159. Historical failure evidence retained.

45. Remove Switch terminal; workspace navigation already covers it.
    Removed both the menu action and the leftover Open terminal tab button on nonterminal surfaces. Workspace tabs/sidebar provide navigation; nonterminal surfaces do not reserve an input dock.

46. Rename a tab by long press or double click on its name; remove menu button.
    Browser verified double-click rename; pointer long-hold handler is implemented, and movement cancels its timer for dragging. Menu button removed. Physical long-touch check remains pending.

47. Opening Keyboard Shortcuts must not summon the iPhone keyboard.
    Opening shortcuts preserves the selected keyboard mode and deliberate reading state. Current panel follows114/116/159; optional-System no-summon check remains historical native evidence.

48. Separate shortcut-panel styling from terminal output.
    Current styling and strip continuity follow153/154/159. Earlier duplicate-rail removal is superseded by the continuous retained strip.

49. Keep the terminal readable while shortcut UI is open.
    Current reserved space and readability follow116/139/159; earlier top-dropdown placement is superseded. Physical-device acceptance is separate.

50. No automatic zoom when touching the terminal; pinch zoom remains available.
    Native Safari reproduced whole-page focus zoom at12px typing display size. Transform scaling on a bounded terminal canvas keeps the editable layout font16px; three native keyboard cycles retain header/tab geometry. Browser two-finger pinch changes terminal content while chrome remains scale1; Reset/reverse pinch reach full view. Your requested typing-size preference remains local to terminal content. Native pinch and physical iPhone remain unverified.

51. Ledger must include every issue, not just the latest.
    Reconciled against the complete visible conversation, retaining earlier requests and their superseding corrections. Original product requirements are individually listed below; no historical item is silently deleted.

52. Study Termius iPhone keyboard and shortcuts.
    Original requested reference is Termius iPhone, correcting the initial Terminus name. Official mobile-terminal keyboard guide reviewed; compact rail, groups and extended keys inform the design. Latest direct-touch behavior follows your Termius comparison.

53. Match cmux full-window hierarchy, grouped workspaces, tabs and names.
    Real-cmux group anchor/member navigation now passes BROWSER_METADATA_RESULT.json. Input remains scoped to explicit workspace/surface UUIDs.

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
    Current reserved space and readability follow116/139/159; earlier top-dropdown placement is superseded.

60. Show more shortcut buttons: make them smaller and remove gaps.
    Current key density, dimensions and configurable rows follow153/155. Earlier screenshot counts describe historical layouts.

61. Make scrollable shortcut/customization areas obvious.
    Browser verified: panel fade/chevron disappears at the scroll end; horizontal rail shows a right-edge cue while more keys exist. Customize has no fixed blank spacer.

## Additional feedback — 2026-10-08

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 62 | Tab headers look like loose text; need clear boundaries. | Each tab has a visible border and shaped upper corners, with the existing blue active edge. Tab-strip height unchanged. Rendered browser verified: visible 1px boundaries, each tab remains 45px tall. |
| 63 | Ctrl+C → Cancel leaves Ctrl highlighted although the next character is plain. | Reproduced in browser and failing regression. Modifier buttons in rail/panel now project from one state; consuming Ctrl clears all visuals before confirmation. Passing regression and rendered browser check; Cancel restores the native caret so the next character is delivered. |
| 64 | With keyboard out, left/right swipes should be arrow keys. | Earlier terminal-swipe behavior is superseded by115–118. Edge drawers follow148; category gestures follow159. |
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
| 70 | Check existing cmux iOS apps; why not obtain output through cmux API server-side? | Independent stock-cmux API mirror implemented; fresh combined real-cmux acceptance follows130 and EXECUTION.md. Earlier pending real-run statement is historical. |

## Phone regressions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 71 | Real terminal scaling is wrong; text and prompt are cropped on iPhone. | Implemented full-grid overview fitting without resizing the Mac PTY, plus independent typing zoom. Actual wide-grid overflow was reproduced before the fit fix and browser widths verified afterward. Physical iPhone acceptance remains open. |
| 72 | Left/right swipes fail; horizontal terminal scrolling may take precedence. | Earlier terminal-swipe behavior is superseded by115–118. Edge drawers follow148; category gestures follow159. |

## Input, zoom and floating functions — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 73 | Typed text sometimes disappears. | Reproduced a live repaint deleting native composition; composition listeners and paint deferral implemented. Regression fails before, passes after. Real iPhone acceptance remains open. |
| 74 | A second cursor appears in the wrong position. | Native browser caret hidden; cmux cursor retained. The subsequent offset report is tracked separately below. |
| 75 | After left swipe opens shortcuts, right swipe must only dismiss shortcuts. | Earlier terminal-swipe behavior is superseded by115–118. Edge drawers follow148; category gestures follow159. |
| 76 | Typing zoom is too close; provide a tunable slider in Settings. | Implemented a 10–22px typing display-size slider, default12px, persisted per browser. Browser slider, persistence and applied zoom verified. |
| 77 | Closing the keyboard should restore global view by default; allow disabling it. | Restore target superseded by110. Explicit full-view/readable Zoom Toggle follows128; automatic keyboard-close restore remains configurable. |
| 78 | Add draggable viewport-relative Floating functions, independent of page zoom/scroll. Hold reveals three configurable branches pointing away from the nearest two view edges. Defaults: reset to maximum/global view, most-used shortcut, copy highlight. Configure in Settings. | Interaction and actions refined by85/127/128/136/143; fourth Keyboard action retained. Current Command handle and branch aesthetics follow160. |
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
| 86 | “Fit” is not the requested reset zoom; reset should set zoom to maximum. | Reset action superseded by Zoom Toggle128. Original reset/page-scale failure evidence retained. |

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
| 91 | Left/right swipe broken again. | Earlier terminal-swipe behavior is superseded by115–118. Edge drawers follow148; category gestures follow159. |
| 92 | Reset zoom does not work (photo2). | Reset action superseded by Zoom Toggle128. Original reset/page-scale failure evidence retained. |
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

Original tiny/raised native input90/98, physical typing acceptance, native duration-controlled hold/multitouch, physical-iPhone acceptance remain separate acceptance gates. Live groups/notifications now pass171; native custom selection and paste pass172. Custom keys own typing; passing synthetic echo does not prove the original physical failure resolved.

User authorization to create a fresh cmux workspace was executed under item130. Current real-cmux acceptance and cleanup pass; no existing terminal received input or rename, and cmux source/settings were not modified. Stock global title flushing remains an external side effect to check on every fixture cleanup.

## Native deletion, compact chrome and mobile sizing — 2026-10-10

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 100 | Holding native Backspace stops deleting after a couple characters; it should continue. | Default-custom held-repeat and immediate retyping pass114/130 and the current real-cmux run. Optional-System sustained native hold remains unverified; repeated taps do not certify it. |
| 101 | Remove the repeated workspace name and move tab navigation up. | Implemented: tabs and one44px app-menu target share a46px top row, reclaiming53px from the previous99px heading+tabs. Workspace identity remains in sidebar/accessibility. Rendered canary failed before and passes after; native Safari current acceptance passed. Current actual touch replay passed twice: tab reorder persists without active-terminal change; blank-rail and tab-origin pull cancel correctly; release reloads one document. |
| 102 | Remove the middle strip above the keyboard that wastes vertical space. | Resolved for default custom mode114. OS accessory limitation applies only to optional System keyboard. |
| 103 | Put the bottom language switch inside the123/ABC switch to reclaim keyboard space. | Native-layout limitation applies only to optional System mode. Custom keyboard and fluid language selection follow114/127/151. |
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
| 113 | Keyboard engaged by default; dismissal is a deliberate reading mode. | Default keyboard engagement follows114; deliberate dismissal is reading mode. Optional-System cold startup remains subject to WebKit user activation. |

| 114 | Replace the native iOS keyboard with a well-emulated custom keyboard to remove its accessory strip. | Implemented and verified: custom terminal keyboard is default, with optional system keyboard in Settings. Actual synthetic touch covers60-character burst, held deletion, following echo, Shift/Caps/modifiers/symbol layers and concurrent contacts. Native Safari/Home Screen avoid the OS keyboard/accessory strip in custom mode; final Japanese/native replay recorded in EXECUTION.md. |

| 115 | Horizontal scrolling keeps breaking left/right terminal gestures; move sidebar opening to a right swipe on the navigation bar. | Superseded by117/118. Terminal horizontal gestures now pan only; no sidebar/keys swipe competes with terminal scrolling. |
| 116 | Swipe up from shortcut strip to expand it, integrated above the keyboard rather than a separate panel at top. | Expansion/stow refined by139/159. Current stow requires deliberate downward pull at scroll top; reaching top alone does not stow. |

| 117 | Correction: RIGHT swipe on nav bar opens sidebar. | Superseded immediately by118; retained as requested ledger history. |
| 118 | Remove navigation swipes; use a left-side icon button to open sidebar. | Verified: left-side44px icon opens sidebar. Navigation swipes scroll overflowing tabs; terminal swipes only pan. Drawer remains closed after landscape rotation. |

| 119 | Tab navigation must slide when tabs overflow the screen. | Verified actual bidirectional overflow drag at320px without selecting/reordering/opening sidebar; held reorder persists after reload. |
| 120 | Display a maximum24 characters per tab name, then ellipsis. | Verified visible labels capped24 Unicode codepoints plus ellipsis, with full title retained. |
| 121 | Holding a tab should offer moving it left/right as well as rename. | Verified long hold opens Rename / Move left / Move right, edge movement disabled; held drag and menu movement share persistent tab ordering. |

| 122 | Sidebar search should also match tab names and on-screen text if inexpensive. | Verified sidebar search matches tab names and cached streamed terminal text, opens matching tab and sends no terminal input. No extra cmux reads; unvisited output is not fetched. |
| 123 | After UI requests, measure input-to-display delay and optimize substantially. | Implemented measured renderer and bridge improvements.4000-row apply+paint median199ms→36ms in Node/JSDOM CPU benchmark; unchanged rows retained, linear history ingestion. Input omits unrelated group RPCs, uses live surface.health membership validation instead of a full tree per key, and wakes matching replay immediately. Real-cmux touch-to-observed-echo samples101–127ms include actuator/observation overhead. Physical-phone/network latency remains unmeasured; details are in EXECUTION.md. |

| 124 | Scrolling to the top of expanded shortcut keys should collapse the panel. | Expansion/stow refined by139/159. Current stow requires deliberate downward pull at scroll top; reaching top alone does not stow. |
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
| 133 | Prompt characters render as boxes although correct on Mac. | Known Powerline glyphs render in native iPhone13ProMax Simulator Safari on the current bundle; proof-reaudit-native-glyphs.png. Cmap/asset regressions and Chrome glyph rendering also pass. Arbitrary private-use font glyphs are not implied. |
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
| 144 | Left/right swipes in expanded shortcut panel switch its tabs. | Actual touch category-bar swipes traverse Keys/Snippets/Customize, with F1 delivered exactly once. Panel-body horizontal scrolling preserves strip/key context under159. |
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

| 163 | Sidebar search needs an × button to clear text. | Verified: appears only for nonempty search; clears query, restores results and retains field focus/sidebar. Fail-before regression and actual phone-size touch canary pass; narrow320px reviewed. |
| 164 | Left and right sidebars must paint above all floating control UI. | Verified: left drawer and its backdrop raised above the floating layer; right drawer already has higher ownership. Actual overlap during both drag previews, settled screenshots and restored control access after dismissal checked. |
| 165 | Icon proposals need two complementary colors and portal/mirror roots. | Superseded by167. Blue/orange curved proposals rejected as browser-like; no installed icon change. |
| 166 | Research modern icon principles online; corrected third meaning root is Poket/pocket, not poker. | Adobe modern logo guidance reviewed for distinctive silhouette, negative space, small-size and single-color recognition. Poker was a corrected typo, never implemented. Solid coral/teal abstractions superseded by167. |
| 167 | A portal in a pocket, with clean lines rather than solid blobs. | Superseded by168; proposal retained in design/icon-concepts-v9/portal-in-a-pocket.png. Teal perspective doorway tucked behind coral pocket lip; initial upright arch discarded because it resembled a padlock. Proposal only; installed icon unchanged pending selection. |

| 168 | Represent portal with a swirl; pocket need not be a shirt pocket or opaque. | New clean-line spiral inside a rounded open pocket outline, complementary teal/coral, in design/icon-concepts-v10/spiral-in-a-pocket.png. Proposal only; installed icon unchanged. |
| 169 | Build the icon from the supplied pocket-and-spiral sketch, excluding the leaf background. | Refined the broad open U pocket with outward lips and nested spiral in complementary coral/cyan. Saved in design/icon-concepts-v11/sketch-refinement.png with generation prompt; visually reviewed against sketch. Proposal only. |


| 170 | Stop icon work and fix every other prior request. | Installed icon unchanged. Full ledger audited against current source and evidence; obsolete UI descriptions now point to superseding requests. Current acceptance and precise remaining physical/native actuator limits are in EXECUTION.md. |
| 171 | Full audit found live cmux notifications discarded before rendering; group-anchor indicators also missing. | Reproduced in owned stock-cmux workspace and failing regression. Bridge now reads notification.list; frontend derives indicators and Inbox from actual unread notifications. Real create→orange target tab/anchor dot→mark-read→clear passes without reload; other workspace/tab stay clear. Live group anchor/member navigation also passes. |
| 172 | Full audit found custom-keyboard terminal noneditable, disabling native selection and editing-menu access. | Native Safari regression failed before: double-tap exposed no Copy/Paste. Connected terminal now retains plaintext-only editing with custom inputmode=none and transparent native caret; beforeinput still prevents local echo. Native double-tap→Copy of actual RECV→Paste→custom q delivers exact bracketed bytes once without Return, with custom keyboard retained. Repeatable native canary and before/after screenshots saved. Timed native hold remains uncertified. |

| 173 | After passkey verification, automatically open terminals instead of stopping at Open terminals. | Reproduced authenticated setup dead-end and failing login/registration/existing-session regressions. Verified: authenticated setup automatically connects and enters real terminals. Login, registration, existing-session, cancellation and retry regressions pass. Physical passkey dialog remains uncertified. |
| 174 | Closing the last tab fails with cmux surface.close invalid_state. | Reproduced exact rejection in owned single-tab workspace and failing regression. Verified by real touch: final live surface closes its workspace; ordinary close preserves siblings. One validated health inventory rejects stale targets before any close. Existing workspaces remain unchanged in final cleanup. |
| 175 | Close/reconnect audit found Output paused banner remained after input had reconnected. | Reproduced after last-tab close and in a failing stream regression. Verified: banner follows live connection state. Real final-tab close returns to a terminal that accepts exact q bytes once and shows no stale pause banner. Failing-before stream regression passes. |

| 176 | Typing any input randomly leaves the visible cursor one/two characters before the end; Right cannot reach the visual end, in both Claude Code and shell. | Verified in native iPhone13ProMax Simulator Safari: original visible cursor was 8.572px before input end despite coherent cmux coordinates. Primary monospace cell metrics now remain independent of symbol-font glyph fallback. Actual custom-key typing, intermediate Left movement, Right to end, deletion/retyping all pass with a 0.082px cursor gap. NATIVE_EDITING_RESULT.json records the final build. |
| 177 | Sidebar plus must offer a new workspace group or workspace. | Verified by actual 428×926 touch: plus offers New workspace and New workspace group; both create exact stock-cmux objects and retain selected grouping. |
| 178 | Hold-drag each workspace to reorder it and organize workspace hierarchy. | Verified by actual touch and native inventory: held members reorder persistently across reload; cancelled drops send nothing; group drops change membership; held group headers move intact blocks; blank-space drop ungroups. Stock desktop group/add/remove and reorder APIs used, without cmux modification. |
| 179 | Terminal output columns and spaces misalign in Pokemux while desktop cmux is aligned. | Verified same font-metric cause as 176. Native original styled table had 12 overflowing spans (up to 50.209px); final native table has zero ASCII overflow, aligned borders/columns, Powerline and Japanese preserved. Before/after screenshots and native receipts retained. |
| 180 | Real touch test found a newly created workspace sometimes loses a held drag while shell metadata is updating. | Verified: unchanged-list metadata preserves pending/active hold DOM and capture; structural changes cancel safely. Connection loss immediately cancels the contact and flushes deferred metadata. Failing-before regressions, independent audit and actual owned-socket disconnect/reconnect canary pass. |

## New rendering, scrolling and keyboard reports — 2026-10-13

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 181 | Left-side Claude Code markers appear as blue square emojis on the phone although they are not emojis on the Mac. Investigate character mapping and presentation. | Fixed: bundled licensed monochrome symbol font supplies bare U+23FA and text presentation without changing characters or cell geometry. Native iPhone13ProMax Simulator before/after changes missing glyph to dot; actual cmux glyph shell also renders dots. Real Chrome font-selection canary fails on prior renderer and passes on fixed renderer, preserving explicit FE0F Apple Color Emoji. Physical-device blue variant still requires user acceptance. SYMBOL_RENDER_RESULT.json. |
| 182 | Provide hardware-scroll-equivalent input for fullscreen TUIs. Prefer making the existing terminal scroll gesture work; otherwise design an elegant minimal control. | Verified in owned stock-cmux fullscreen less: the same vertical finger swipe left row0 unchanged before and moves down/up after. Alternate-screen mouse/alternate-scroll modes route to terminal.scroll; ordinary mirror panning and floating-control second-finger pan remain local. Native routing and gesture regressions pass. Claude Code help did not respond to wheel input; not claimed supported. |
| 183 | Fast emulated typing loses characters; overlapping contacts sometimes do not light keys, while system keyboard is fine. | Reopened after earlier gap-drift fix. Actual-phone trace captured186 downs,11 ignored inside the keyboard with no key target; every queued input delivered. Semantic button areas now meet across visible key gaps and home-row side gutters, while inner caps preserve spacing. Overlapping contacts retain glow until the last contact leaves. Before:62 gap probes had no key, and two-finger glow regression failed. After:62 probes belong to keys;52 gap/overlap contacts and separate50-character touch canary reach disposable stock cmux exactly once.208 exact-artifact tests pass. REOPENED2026-10-15: user confirms losses remain, now fourth fast touch may be missed rather than second. New page1d9f... logs119 accepted contacts, no unpaired accepted contact, only2rejected bottom-padding contacts, queued123=delivered123. Prior gaps fixed but overall typing bug remains OPEN. Investigate raw touch versus pointer delivery and actual UI target before another fix. |
| 184 | Keyboard Hide sometimes immediately reopens the emulated keyboard, reliably after switching workspace/tab; native iOS tick works. Safari and Home Screen on iOS26.6.2. | Fixed producing focus path: custom input engages through explicit gestures, not browser terminal focus. Actual phone captured Hide→hidden→terminal-focus23ms later→reopened twice (PHONE_HIDE_BEFORE.json). Regression failed before/pass after. Real428×926 touch long-hold reproduces browser focus and fails on old handler, passes fixed handler; deliberate tap still engages and q reaches stock cmux exactly once. BROWSER_HIDE_FOCUS_RESULT.json. User now reports dismissal appears fixed; recent actual-phone trace has five stable Hide transitions with no automatic reopen before explicit engagement. PHONE_HIDE_AFTER.json. |
| 185 | Read all requests and ledger them before implementation. | Done for this batch: read the full existing ledger and recorded 181–184, including the emulated-only clarification, before code changes. Earlier requests and superseding corrections remain retained. |
| 186 | Each workspace group needs a + button to add a workspace directly under that group. | Verified: the clicked group plus creates exactly one native workspace under that group, selects it and displays typed q and its deletion. Group-plus holds do not start workspace reordering. |
| 187 | Emulated keys are too close together and too small; match the comfortable system keyboard size and shape. | Verified phone-sized layout with52px portrait keys,24px letters and6px gaps. Rounded key shapes and staggered rows retained; landscape compact height retained. Screenshot aesthetically reviewed and rapid-touch canary rerun on final geometry. Exact native system-keyboard visual comparison remains unverified because Simulator UI became unavailable. |
| 188 | Group-add E2E exposed concurrent workspace metadata refreshes exhausting cmux system.tree rate limits, leaving the new workspace unselected. | Reproduced request burst and cmux rate_limited rejection. Native metadata now batches into one shared inventory, including a subsequent refresh when metadata arrives during an active read; browser applies the supplied inventory without refetching. Combined group creation/selection/input E2E and concurrency regressions pass. |
| 189 | Native iOS Paste fails both in the terminal typing area and in the manual paste field shown after clipboard permission rejection. | Open: baseline native iOS26.3 Simulator terminal menu Paste delivered READY once. Manual field menu Paste delivered POKEMUX_NATIVE_FIELD once after fixture-injected NotAllowedError. User confirms native iOS paste and fallback text field work; floating control clipboard read fails until fallback paste. Investigate the floating gesture activation path. No speculative paste change. |
| 190 | Clipboard access is blocked; fix the paste permission flow rather than showing a dead-end. | Actual phone reproduced two drag-to-Paste requests rejected with NotAllowedError (1139ms/942ms, including activation=true); native field delivers. WebKit separately requires a valid clipboard gesture (bug258068 and LocalFrame::requestDOMPasteAccess). Changed release to preserve highlighted existing button as Tap to paste; fresh click requests consent synchronously. Failing-before regression and actual428×926 long-drag/fresh-tap clipboard→stock cmux E2E pass. Native iPhone13ProMax Simulator direct tap opens OS Paste consent and delivers exact payload once.204tests pass; Physical iOS26.6.2 now confirmed: one request→native Paste bubble→read→delivery, no denial or fallback. User confirms paste works; usability remains open under197. PHONE_PASTE_AFTER.json. PHONE_PASTE_BEFORE.json, BROWSER_FLOATING_PASTE_RESULT.json, NATIVE_FLOATING_PASTE_RESULT.json. |
| 191 | Shortcut dock needs three pull-controlled positions: fully hidden, strip only, fully expanded; pulling down hides the strip and pulling up restores it. | Verified: hidden handle → strip → expanded and reverse transitions use actual touch-engine contacts. Partial movement follows finger; reversal/cancel retains prior state. Expanded grip stows panel before strip can hide. Horizontal strip scrolling and zero terminal input checked;195 tests pass. BROWSER_DOCK_RESULT.json and proof-dock-hidden.png record final geometry. |

| 192 | Request passkey automatically rather than requiring Use Passkey every visit. | Implemented locally: once per unauthenticated page entry for an enrolled credential; cancellation/manual retry, explicit registration and duplicate-button checks pass. Full suite197 passes; targeted7 pass after audit tightened ceremony assertions. Not deployed: origin accessible again; native Safari automatically opens the system passkey sheet and cancellation returns manual retry. Full login E2E remains unverified: CUA CDP does not support WebAuthn virtual authenticators and Simulator has no enrolled biometric credential. |
| 193 | Clean up the reported 15 agents. | Checked: only root active; exposed children completed or errored. No active child work to stop; historical entries cannot be removed through available agent controls. |

| 194 | Add actual-phone logging for custom keyboard Hide and paste failures; device is iOS26.6.2. | Actual phone161events captured, establishing184 root cause. New contact lifecycle/delivery counters and floating gesture/action logging distinguish input loss and failed Paste selection without typed/clipboard contents. Authenticated schema, privacy tests and real touch/cmux HTTP logging pass.203tests pass for exact commit artifact; pending passkey work excluded. |

| 195 | Native terminal Paste menu is hard to reveal: long-hold usually needs3–4 attempts. Floating Paste must be dependable as the primary path. | Implemented primary floating flow from190; no terminal selection or textarea needed in the verified native consent path. Drag chooses/highlights Paste, then the explicit button tap requests iOS consent. Native menu remains secondary. Physical-device paste now succeeds; user rejects the extra steps as bad UX. Continue under197. |

| 196 | Aesthetic/interaction check found the joystick covering part of an expanded floating function button. | Fixed expanded function stack above the joystick. Actual browser hit-test canary fails without the stacking rule and passes with it; existing colors, margins and button sizes retained. |

| 197 | Paste bubble appears and paste works on the actual phone, but drag→Tap to paste→OS Paste is bad UX. Reduce the interaction cost. | Superseded by198: user accepts the current floating fresh-tap flow and rejects a persistent button. Recorded actual-phone functional success separately from UX acceptance. User clarified: keep the existing Paste button inside floating functions and make it paste directly; they do not want the extra iOS bubble. The whole-control single-tap proposal was a misunderstanding and remains unimplemented. Investigate improvements against that exact intent; do not treat bubble-based success as UX acceptance. Safari-controlled consent remains an external boundary; no clipboard read before explicit Paste intent. |

## Paste affordance, typing priority and selection — 2026-10-14

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 198 | Keep the existing floating Tap to paste flow; no persistent Paste button or new UI. Make the armed button bigger and orange so the required tap is obvious. | Verified locally: armed existing branch is128×56, orange with8.65:1 text contrast; no new button. Actual428×926 touch→clipboard→owned stock cmux delivered once.320px and2×browser-zoom geometry remains in view and preserves physical target size. BROWSER_FLOATING_PASTE_RESULT.json and proof-floating-paste-ready.png. |
| 199 | Native terminal selection and its adjustable start/end handles are too faint and unobvious. User clarified handle dragging works. | Root style used transparent caret-color; WebKit derives selection tint from that same color. Noncollapsed selection now uses existing blue tint, opaque blue text highlight and dark ink; collapse restores transparent insertion caret so cmux remains the authoritative cursor. Workercaa8031 integrated. Regression fails before and passes after; real browser mouse range paints high-contrast selection without changing copied text. Simulator long-press automation did not establish native handles; iOS appearance awaits physical confirmation. No custom handles or extra selection UI. |

183 priority raised: missed emulated keys remain the single most annoying problem; native iOS input works. Re-read actual-phone logs and reproduce the failed contact before changing input handling.184 user now reports dismissal appears fixed; deployed41f046c prevents browser focus from re-engaging custom input, with before/after touch evidence. Recent phone trace shows five Hide transitions stay hidden until explicit engagement, including a workspace switch.

| 200 | After the orange Paste update, the native Paste bubble appeared once although a previous release appeared to paste directly; subsequent attempts now skip it. | Investigating first-read versus repeat-read clipboard consent. Actual phone page1738... first fresh tap waits6.1s thenNotAllowedError/fallback; later fresh tap reads in31ms and delivers. Clipboard handlers and floating tap bindings are byte-identical to977fe08; no claimed cause from styling. User clarified first-attempt-only behavior. |

199 clarification: native start/end handle dragging WORKS. The bug is poor visibility/discoverability of the selection and handles. Screenshot22808B81 shows edit menu but selected text/handles blend into the dark terminal. Fix contrast without replacing native selection gestures.
183 actual phone page1738... now captures186contacts and11unaccepted down events; every queued input delivered. Some rejected coordinates are keyboard gaps, others bottom padding. User observes subsequent fast touches do not light keys. Reproduce exact rapid/multi-contact sequence before fixing hit-test producer; do not call all blank keyboard padding a key.


## Native tab ordering — 2026-10-15

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 201 | Pokemux tab order contradicts the Mac's native cmux order. | Fixed: native cmux pane metadata defines tab order; obsolete phone ranking is removed. Phone Move left/right and held drag use scoped native reorder, reject cross-pane targets, follow native selected tab, and keep controls open. Actual finger before reproduced phone-only order; after native Move left/right, held drag, desktop reorder and refresh passed. BROWSER_TAB_ORDER_BEFORE.json, BROWSER_TAB_ORDER_RESULT.json, BROWSER_TAB_DRAG_RESULT.json. Independent test audit passed. |

183 OPEN: user reports rapid emulated typing still misses, more frequently inside Claude Code TUI than a shell. Latest physical trace a900... has174 raw contacts and172 accepted key contacts;206 queued inputs all acknowledged. That trace lacks expected TUI echo and cannot establish which layer loses characters. A disposable Claude TUI is awaiting approval of its empty folder trust prompt. No new input-handler fix is claimed.

183 Claude TUI verification — 2026-10-15: accepted the empty test folder trust after user approval. Actual Chrome428×879 single/two/four-contact bursts preserve108/108characters in stock cmux Claude2.1.300 and Pokemux; native iPhone13ProMax Simulator Safari26.3 final36-contact burst also preserves36/36, with phase-specific native snapshots. This does not reproduce the physical iOS26.6.2 failure. The test DID reproduce lost diagnostic records: per-event fetch keepalive exhausted the shared64KiB in-flight budget and produced TypeError. Removed keepalive from diagnostic POSTs; before CLAUDE_TYPING_BEFORE.json fails, after both canaries capture every contact phase. Keyboard input behavior is unchanged. BROWSER_CLAUDE_TYPING_RESULT.json and NATIVE_CLAUDE_TYPING_RESULT.json codify actual input primitives and exact native echo.183 remains OPEN pending a physical failure trace with complete diagnostics.

## Modifier locks and Paste release investigation — 2026-10-15

183 user now reports “Typing Seems fixed at last!” Record qualified physical acceptance after eb56289; keep the causal distinction: the last verified root fix repaired diagnostic transport, not a separately reproduced input drop.

| # | Complaint / intent | Change / evidence |
|---|---|---|
| 203 | A second tap on each modifier shortcut should lock it for repeated modified keys, such as Ctrl-C/D/K. | Fixed: off → one-shot → locked → off, with a compact lock badge. Locks survive repeated input, shortcuts, Backspace and joystick; existing navigation/disconnect/Hide resets remain. Before-failing regressions and actual Chrome touch/native Safari26.3 tap canaries deliver exact Ctrl/Alt/Shift bytes to disposable stock cmux. The E2E-exposed stock cmux Alt printable policy is handled with explicit terminal Meta encoding. BROWSER_MODIFIER_LOCK_RESULT.json, NATIVE_MODIFIER_LOCK_RESULT.json and proof-native-modifier-lock.png. Independent test audit passed. |
| 204 | Tapping floating control then Paste succeeds without orange confirmation. Investigate whether a synchronous emulated Paste tap after drag release can remove the extra orange tap. | Investigated: native Simulator Safari26.3 rejects direct release, nested button.click and touchend reads with NotAllowedError/activation false; fresh real tap reaches native Paste consent. Programmatic click does not manufacture a new eligible gesture. The native drag tool omitted movement events, so a disposable probe classified final displacement; this establishes the permission boundary, not physical iOS26.6.2 gesture acceptance. Clipboard may change concurrently; no clipboard contents are stored in receipts. Preserve working tap-to-Paste and orange tap after release. NATIVE_PASTE_RELEASE_RESULT.json and repeatable native-paste-release-probe.mjs. Production Paste gesture unchanged. |

Verification repair: fixture cleanup now writes a fresh failed receipt even when a strict before/after assertion throws. Actual owned companion canary confirms the fixture is removed and non-owned companion survives until explicit cleanup. FIXTURE_CLEANUP_FAILURE_RESULT.json.

205 FIXED — 2026-10-15: literal shortcuts were wrongly routed to cmux surface.send_key. Native pipe/tilde/backtick rejected invalid_params; backslash returned accepted without emitting input. All unmodified single-codepoint shortcuts now use terminal.input, covering punctuation, letters, digits and Unicode; modified and named keys retain their routes. Regression fails before and passes after. Actual iPhone13ProMax-profile Chrome finger taps, strip/expanded panel and native Safari26.3 Simulator taps each deliver exact backslash/pipe/tilde/backtick bytes twice. SYMBOL_SHORTCUT_BEFORE.json, BROWSER_SYMBOL_SHORTCUT_RESULT.json, NATIVE_SYMBOL_SHORTCUT_RESULT.json. Independent test audit passed. No cmux modification.

183 REOPENED — 2026-10-15: user still loses approximately one in four emulated-keyboard characters, especially in TUIs. Prior qualified acceptance is withdrawn. Re-examine physical touch/contact/commit/delivery records and actual TUI echo; do not treat acknowledgements or Simulator success as phone acceptance.
183 current investigation: fresh phone trace contains352 custom contacts and340 acknowledged input actions; this does not establish intended or displayed text. Under6xChromeCPU slowdown, owned Claude single/two/four-contact tests preserve108/108 characters, and a redrawing terminal preserves72/72 centered contacts plus22/22 replayed phone contacts. None reproduces the physical failure; no input-handler fix is claimed. An empty “Pokemux typing test” → “Claude typing” tab awaits one controlled16-character phone burst to distinguish contact loss, native TUI consumption and display loss. TYPING_REOPENED_PROBES_RESULT.json records limits and evidence.

183 latest physical clarification — 2026-10-15: missed keys do not glow. Alternating wide s/o keys reproduces intermittent unlit o; close asdf did not reliably reproduce. Continuous finger slides commit the final touched key on release (current behavior), which is distinct from missing discrete contacts. Fresh page7486... has157 raw starts/ends and157 delegated down/up pairs; all156 accepted downs finish, with no key-drift/cancel during the s/o run. One rejected contact is bottom keyboard padding. This rules out a captured accepted contact being discarded in that run, but does not prove every intended physical o reached the browser. Inspect actual delivery/targeting before changing the producer.

183 counted phone probe — 2026-10-17: requested16 alternating s/o taps. Captured17 raw/down/up contacts (10s,7o),17 queued/delivered actions and exactly17 matching native Claude characters. No drift/cancel or other-target pointerdown in that burst. Consecutive s contacts already exist in the raw sequence. Requested versus observed counts differ, so confirming whether the user saw an unlit missing o during this particular run remains necessary. Native iPhone13ProMax Simulator Safari26.3 repeated-key canary now codifies5 triple taps on o plus8 so pairs. With actualClaude2.1.301, all31 touches/commits/nativecharacters match; repeated-location intervals147–165ms. Foreground ownedURL, fresh empty composer and fresh after-snapshot verified; independent audit passed. This does not establish physical26.6.2 success or justify an input-handler change. TYPING_COUNTED_PHONE_RESULT.json and NATIVE_KEY_REPEAT_RESULT.json.183 remainsOPEN.

183 confirmation — 2026-10-17: user confirms very fast typing still has unlit missing keys. Matched accepted/delivered counts do not address contacts that never became keys. The user's drag/swipe-coalescing explanation remains a hypothesis to test, not a reason to close183.

| 206 | Use iOS/system keyboard by default until emulated fast typing is proven. | Fixed: new and existing clients switch once to system keyboard; explicit later Pokemux keyboard opt-in persists. Native Safari26.3 one-tap engagement and system keyboard verified.183 remains open. |
| 207 | TUI drag scrolling is too insensitive and stops without inertia. Default sensitivity must double, and sensitivity/inertia must be adjustable in Settings. | Fixed: default2× with Settings sensitivity0.5–4× and inertia0–100% (0 disables, default50%). Real Chrome finger canary against stock cmux less moves15rows at1× versus30at2×; release coasts and new touch stops it. Also fixed redraw detaching the original touch target by targeting the stable terminal root. Native Safari selection menu remains available. BROWSER_SCROLL_BEFORE.json, BROWSER_SCROLL_SETTINGS_RESULT.json, NATIVE_SCROLL_UI_RESULT.json. |

Verification206/207: three before-failing behavior regressions plus delayed-coast cancellation;223 local tests and222 exact-artifact tests pass. Independent test audit passed. Custom keyboard fast typing is still unproven and183 remainsOPEN. Native handle adjustment is not certified by this run.

183 realistic-input clarification — 2026-10-17: user compares fast “can I type very fast now” in the same TUI. Native produces the intended sentence except acknowledged mistaps; custom examples include “ca ithe vryast now” and “can i typevr ast no”. Missing unlit keys remain unresolved. User notes native magnified key preview gives clearer contact feedback; record as a feedback improvement to consider, not proof that errors are user mistaps.

Read-only investigation: current custom handler tracks independent pointer IDs, uses touch-action:none, selects the final contacted key on pointerup and changes that selection during drift (index.html:226–229). Terminal requests autocorrect/autocapitalize off. Fresh page a747... includes46 overlapping raw starts, five rejected background contacts and one deliberate-looking slide crossing five keys then committing once; exact sentence boundaries are absent, so none proves the realistic typing loss. Next evidence should segment the supplied sentence and correlate raw contact→hit region→key choice/drift→commit→feedback paint timing, with bounded local buffering rather than per-event network flooding. Keep system keyboard default.

183 QuickPath observation — 2026-10-17: user confirms native continuous swipe across a word works without lifting until its end. Apple documents this as QuickPath (https://support.apple.com/en-mide/guide/iphone/iph3c50f96e/ios). Native therefore supports a whole-word gesture; current Pokemux release handler commits only the final selected key. Connected micro-slides during fast typing could explain some discrepancy, but this does not establish the cause of lost discrete taps or justify treating Apple’s internal classifier as known. Distinguish connected slides from separate overlapping contacts in the realistic-sentence trace. No QuickPath implementation requested or claimed.

183 next phone test prepared — 2026-10-17: owned “Pokemux typing test” → “Claude Code” has an empty actual Claude composer. One fast natural “can i type very fast now” (23characters), no correction/Enter, will delimit a realistic burst; existing bounded content-free trace is active. Optional outside video showing fingers and keyboard supplies physical contact/lift evidence absent from a screen recording. Metadata/log offset: state/realistic-phone-typing-info.json. Await user completion before native/trace readback and owned-workspace cleanup.

183 actual phone failure —2026-10-17: controlled24-character sentence became19characters `can  typever ast no` in native Claude.20raw/19accepted sentence contacts;one background rejection,four intended contacts unexplained;no recorded sentence drift/cancel.154generated orders123–276 contiguous, but outside-target filtering prevents asserting physical touch completeness. New recorder removes that blind spot while custom keyboard is visible, adds sampled movement/numeric key geometry and bounded batches. No input semantics changed;183 remains OPEN, iOS keyboard default.224exact-artifact tests and actual Chrome/native Safari recorder canaries pass; independent audit accepted. SeePHYSICAL_REALISTIC_TYPING_RESULT.json andTYPING_REOPENED_STATUS.md.

183 second physical capture —2026-10-17: excluded everything through userooo+Backspaces marker and the later bottom-padding gesture. Actual`ca itye very fas now`20/24;20raw starts/ends,20accepted and20queued/delivered. Missingn/space/p/t have no separate raw contacts, with zero sentence drift/cancel/rejection;397pageorders complete. Expanded unfiltered capture and numeric geometry active. This narrows the observation to absent browser contacts without proving a native recognizer cause. OPEN; no input-code change. Physical composer preserved. SeePHYSICAL_EXPANDED_TYPING_RESULT.json.

| 208 | Default floating controls overlap letter keys and steal keyboard taps. | Fixed unsaved defaults: both controls sit below the last key row, with zoom accounted for; saved dragged positions remain. Actual Chrome baseline24raw/23keys/onefloatingcontact, missingp. Before-failing footer regression now passes;231exactartifact tests, fixed-center3mode touch comparison and combinedstockcmux26charcanary pass. Separate from183missingrawcontacts. KEYBOARD_FOOTER_BEFORE_RESULT.json,KEYBOARD_FOOTER_CMUX_RESULT.json. |

183 investigation continues: prepared derived-source comparison underprivate/typing-lab, withquiet(no terminal transport/redraw),bare(keyboard only),blocked(bare+touchstartdefaultcancellation) modes. NativeSafari/Chrome validation and independent audit complete; no physical fix claim. Asked user to comparebare/blocked withsameknownsentence. Typedtext stayslocal; existingauthenticatedcontentfree trace receives phase0/1/2markers. No further unstructured typing/logging request.

| 209 | Private keyboard comparison link cannot open. | Reproduced HTTPS502: its temporary exec process had ended, leaving the proxy pointing at an empty port. Dedicated loopback-only launch agent now keeps the test fixture alive across replies. Same availability check fails before/passes after; terminating only the owned process proves automatic restart. Actual Chrome renders the HTTPS comparison. Normal bridge PID, source/auth hashes, and every proxy handler unchanged. Phone reopening still requires user acceptance. KEYBOARD_LAB_AVAILABILITY_RESULT.json. |

183 alternating-key clarification —2026-10-17: user reports repeated single keys do not miss, repeated Type often misses p, and16alternatingg/o misses~3–5 in BOTHbare/blocked modes. Preserved19latepages:238raw key contacts/238accepted, everypageordercomplete, zero drift/cancel; these counts do not recover the unreported physical contacts or establish per-attempt intended lengths. Browser gesture cancellation has not resolved the failure. A test-only surface mode keeps visual geometry but changes children to pointer-events:none, resolves keys by rectangles, and captures on the stable keyboard root. Fourmode24charChrome and sixsame/alternating/type16charChrome cases pass; nativeSafariSimulator16alternating taps/visiblegogogogogogogogo pass;232exactartifacttestsPASS(233withunrelatedpasskeywork). Independent audit accepted fixed-location scope; sliding boundaries are not certified. No production input change or physical fix claim. Native keyboard remains default. PHYSICAL_KEYBOARD_COMPARISON_RESULT.json,KEYBOARD_ALTERNATING_BROWSER_RESULT.json,KEYBOARD_SURFACE_NATIVE_RESULT.json.

183 physical One surface failed —2026-10-17: user confirms same behavior. Six typingpages contain85accepted keycontacts, with completeorders and no drift/cancel; rawpaddingcontacts are retained separately in PHYSICAL_SURFACE_COMPARISON_RESULT.json. One stable hit target/rootcapture is not sufficient. Addedtest-only Direct touches mode4: staticvisualmarkup only, directTouchEvents, no originalpointer/capture/globalrecorder, paint/uploadafter300msidle. Authgatesinitialization; onebatchperidle prevents uploadcontinuations duringresumedtyping. Before-failing auth3tests and resumedbatchregression nowpass;237exactartifact/238withpendingpasskeyPASS. RealChrome9same/go/type cases16/16 andnativeSafariSimulator16go/16exactechoPASS. Auditaccepted diagnosticlimits; sourcekeyboardunchanged/native default, no physicalfixclaim. Useraskedonesamefastgo16thenpause2sec onmode4. Keepcaptureboundaryinstate/keyboard-isolation-info.json; privateAPIguardsandnormalPID74118/source/setup/credential/proxyunchanged.

## Terminal links and clicks — 2026-10-18

| ID | Request | Status and verification |
| --- | --- | --- |
| 210 | Terminal hyperlinks, including linked labels with hidden URLs, must open from the phone. | OPEN, native metadata required. Disposable real OSC8 output reproduces the screenshot: replay carries the linked label and style but no destination. Native RowSpan has no URL field; replay chooses grid instead of raw VT. Existing text/action exports do not provide a cell's hidden URL. No guessed label-to-URL mapping or cmux modifications. Need a native hyperlink export before phone navigation can be implemented and verified. |
| 211 | General terminal clicking should work for mouse-aware TUIs such as Claude Code. | Verified stock cmux mouse routing in native iPhone13ProMax Simulator: original tap sends zero bytes; current taps deliver exact cell reports at two zoom levels, and actual Claude cursor moves8→5. Final integrated run creates a named tab, then sends exact cell9,1 reports and native keyboard modifier bytes. Long holds/drags do not click; native selection handles and physical-phone acceptance remain separate. NATIVE_TERMINAL_CLICK_RESULT.json, NATIVE_CLAUDE_CLICK_RESULT.json, FINAL_COMBINED_NATIVE_RESULT.json. |
| 212 | Ask for a workspace name before creating it; prefill and fully select the default so typing replaces it. | Verified native Safari default selection, exact typed replacement, Cancel visibly closes without creating, and Create produces the exact name in the captured group. Shared creation producer covers global/group/context entry points. Regression/audit passed. COMBINED_NATIVE_CREATION_RESULT.json. |
| 213 | Ask for a tab name before creating it; prefill and fully select the default so typing replaces it. | Verified native Safari selected default, replacement, Cancel with no creation, actual named tab and usable shell; final combined run launches the mouse canary in another UI-created named tab. Native API has no create-title field, so explicit rename targets the returned new surface. COMBINED_NATIVE_CREATION_RESULT.json, FINAL_COMBINED_NATIVE_RESULT.json. |
| 214 | Tapping a shortcut in the strip intermittently dismisses the system/iOS keyboard and does not fire the shortcut. | OPEN for physical-phone dismissal. Confirmed metadata refresh detaches pressed shortcut nodes; preserve the unchanged rail and active gesture instead. Regression fails before/passes after for modifier cycle, focus, scroll and drag cancellation. Native plain Ctrl tap/lock/unlock survives metadata updates; integrated native Ctrl-L twice→unlock→literal l delivers0c0c6c with keyboard visible. Duration-controlled150ms taps still fail activation in Simulator and do not establish the phone root cause. Content-free shortcut target/gesture capture now distinguishes missed action from focus loss; do not close214 from these passing controls. |
| 215 | Name dialog buttons overlap Safari's keyboard accessory bar during native input. | Reproduced visually; ordinary dialogs now center within the visual viewport. Native screenshot review confirms the full selection and both buttons remain above the keyboard. The repeatable native canary takes fresh coordinates after typing and requires actual Cancel dismissal, avoiding a false pass from unchanged inventory alone. proof-creation-dialog-visible.png; COMBINED_NATIVE_CREATION_RESULT.json. |

183 direct-touch physical comparison —2026-10-18: user tried several times, no substantial improvement. Nine nonempty phase4pages initiallycaptured; recorded starts/ends/accepted pairs match andorderscomplete. No unexplained extra active-touch counts or orphanends in all three savedcomparisontraces. Userthenreports onefingerdoesnotmiss, butlatestloggedcontrols showonlyorepeats17/17/16; awaitingclarificationwhetheronefingermovedbetweeng/o. Keepmultitouch/physicaltiminghypothesisunconfirmeduntilcontrolmatched. No productioninputfix; native default remains.

| 216 | Red Close workspace confirmation still fails with cmux confirmation_required. | Fixed and native Simulator verified. Red confirmation carries confirmed:true to force:true; unconfirmed/malformed/Cancel cannot close busy workspace. Actual before confirmation_required; final Cancel preserves and Confirm removes owned busy workspace. Empty state detaches the terminal stream and keyboard. LATEST_BUGS_NATIVE_RESULT.json. |
| 217 | Clicking a terminal link opens on the host; route it to the phone/Pokemux client instead. | PARTIAL within stock cmux: complete visible HTTP(S) URLs open on the phone without forwarding mouse input; native Simulator verified. Hidden destinations and ambiguous wrapped URLs cannot be inferred; those clicks still reach the TUI and may open on the host. Native API modification explicitly denied; no cmux changes. |
| 218 | Double-tapping an emulated key can zoom the whole page; refresh does not restore it, reopening Home Screen app does. | Patched; physical after verification pending. Actual phone trace proves scale1→1.6 after keyboard touch and next page retains1.6. Nonpassive keyboard touchstart owns native defaults across keys/gaps. Native Simulator repeated keys and footer gap taps deliver exact settled bytes at scale1 across refresh. PHONE_PAGE_ZOOM_RESULT.json and LATEST_BUGS_NATIVE_RESULT.json. |

| 219 | Pull-to-refresh arrow spins to arbitrary directions after release. | Fixed; the armed orientation stays unchanged while reload is pending. Regression reproduced release-only spinning; animation removed. Final displacement classifies pulls even without intermediate move events. Real native header drag reloads, confirmed by new diagnostic page, and keys work at scale1 afterward. LATEST_BUGS_NATIVE_RESULT.json. |

214 renewed20261018: Physical trace shortcut press/release then click retargeted outside and terminal blur. Shared shortcut gesture now activates original key on completed pointerup, prevents native touch focus defaults, ignores compatibility duplicate clicks, and rejects drags/cancel/stale target. Before-failing regressions pass. Guarded settled native Ctrl lock/repeatedCtrl-L/unlock/literal l yields0c0c6c with iOS keyboard visible; physical after verification remains pending. LATEST_BUGS_NATIVE_RESULT.json.

| 220 | cmux must remain unmodified; investigate preventing host link opens without breaking other TUI clicks. | Verified without modifying cmux. Complete visible HTTP(S) URLs route to phone Safari; ordinary TUI click reports remain intact. Hidden-link labels and arbitrary application side effects cannot be selectively intercepted with current stock metadata. KEYBOARD_LINK_RESULT.json. |
| 221 | Build local spatial key targeting, per-thumb calibration, movement tolerance, enlarged key previews, and a lightweight English guesser. | Implemented. Local spatial/English decoder, per-thumb calibration, independent key previews and stable contact tracking. Native Simulator phrase/modifier/Japanese/symbol/calibration canaries and independent audit pass. Native keyboard remains default; physical two-thumb acceptance and183 remain open. KEYBOARD_LINK_RESULT.json. |

| 222 | Native key slide can release over a neighbor without pointermove and wrongly commit the starting key. | Fixed at release coordinate processing. Actual native slide sent g before and h after; failing-before/passing-after regression. KEYBOARD_LINK_RESULT.json. |

| 223 | Entering a fullscreen TUI retained primary-screen scroll and hid its top rows. | Fixed at painted-screen transition. Native before hid URL/header; after shows both and supports correct link/ordinary clicks. Regression fails before/passes after. KEYBOARD_LINK_RESULT.json. |

| 224 | Keep emulated key processing fast and light. | Native release p95 about4ms before,2ms after; press p95 about1ms. Redundant key-label replacement was reproduced and removed at modifier consumption. Regression fails before/passes after. Local decoder p95 below0.001ms; model44,987bytes. KEYBOARD_LINK_RESULT.json. |
