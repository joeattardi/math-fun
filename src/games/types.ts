import type Phaser from 'phaser';

/** Everything the menu needs to show and launch a game. */
export interface GameDefinition {
  id: string;
  title: string;
  /** Tile color in the menu. */
  color: number;
  /** Draw the tile icon centered at (0, 0), about 140px across. */
  drawIcon: (g: Phaser.GameObjects.Graphics) => void;
  /** Scene key the menu starts when the tile is tapped. */
  entryScene: string;
  scenes: Phaser.Types.Scenes.SceneType[];
  /** Optional parent stats lines for the hidden stats screen. */
  parentStats?: () => string[];
  /** Parent stats screen "unlock all levels" hook. */
  unlockAll?: () => void;
}
