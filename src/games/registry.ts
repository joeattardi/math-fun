import { greaterOrLess } from './greater-or-less';
import { orderingNumbers } from './ordering-numbers';
import type { GameDefinition } from './types';

/** Every game in the menu, in order. Add new games here. */
export const games: readonly GameDefinition[] = [greaterOrLess, orderingNumbers];
