# Original Hellgate reference study

Current direction, reconciled 11 October 2026 (America/Denver): the user answered the original visual questions and subsequently requested leaner models and doubled voxel count. Characters and buildings both felt too short. Preserve original-Hellgate armor, firearms, Cabalist identity and London architecture in a finer, more detailed voxel treatment.

Armor must attach to the base rig and visibly swap. **The user confirmed in this review that helmet, chest, arms and legs must be independently equippable loot.** Current code now implements all four slots, independent item rolls and comparisons, per-slot appearance synchronization, companion equipment selection, and reconnect/checkpoint restoration. Worn gothic technology is the working interpretation established during the build, not a separately answered tone selection.

Most or all building structure should be destructible, with stone resistant to ordinary attacks and vulnerable to explosive/powerful abilities. The user confirmed localized collapse of unsupported sections. This supersedes the original limited-cover destruction scope.

## Sources examined

- [Original Hellgate: London manual](https://datassette.s3.us-west-004.backblazeb2.com/manuais/hellgate_london.pdf), printed pp. 5–7 / PDF pp. 4–5: distinct Templar, Cabalist and Hunter character identities.
- [2007 street combat screenshot / GameStar](https://www.gamestar.de/artikel/hellgate-london-bild-zeigt-neues-interface,1469220.html): tall masonry frontages, ground-level shops, damaged windows, lamps, rubble, dark plate armor and luminous weapon effects.
- [Original-game Marksman inventory reference / GameStar gallery](https://www.gamestar.de/galerien/hellgate_london,52002.html): human limb proportions, layered body armor, exposed joints, large weapon systems and a restrained metal/cloth palette.
- [Bill Roper faction interview summary](https://www.gamebanshee.com/news/81939-hellgate-london-interview-v15-81939.html): futuristic-knight Templar, sleek Hunter and dark Cabalist identities.

Reference images were examined in temporary files. They are not copied into the game's distributable assets.

## Reference principles

The original balances adult human proportions with exaggerated equipment. Armor bulk comes from individual pauldrons, chest plates, greaves, gauntlets and weapons rather than a single wide box torso. Heads are relatively small; long legs, elbows and knee breaks keep even heavy armor from feeling squat. Faction identity should survive as a silhouette at combat distance.

London buildings frame the street well above the player's height. Repeating brick and stone stories, shop fronts, lintels, cornices and damaged upper floors create scale. Rubble interrupts an otherwise believable street and Underground structure. Destruction and demonic light sit inside that recognizable architecture.

Translate these relationships into original geometry: fine actor voxels, articulated longer limbs, layered faction armor, distinct demonic profiles, taller facade stories, architectural depth and deliberate warm/cool lighting. The current rig and Strand building system implement part of this direction; the follow-up pass adds shaped limbs and helmets, tapered chest plates, smaller Hunter back equipment, domed pauldrons, distinct upgraded details, recessed windows and projecting cornices. These are implemented improvements, not user visual acceptance. Technical subdivision alone does not establish visual quality.

Review artifacts are generated in `test-results`: combat and inventory captures plus an armory preview for each class. Next checkpoint: user visual review at inspection and normal combat distances. Carry the resulting treatment across the slice while preserving responsiveness, clear enemy tells and measured rendering budgets. See [implementation status and next steps](../../IMPLEMENTATION_STATUS.md).
