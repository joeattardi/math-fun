import type { LevelFlowConfig } from '../../shared/levels/config';
import { GAME_ID, SCENES } from './constants';
import { chompLines } from './lines/chomp';
import { hopsLines } from './lines/hops';
import { bestScorePraise, recordPraise } from './lines/praise';
import { waddlesLines } from './lines/waddles';
import { LEVELS } from './questions';
import { uiText } from './ui-text';

export const levelFlow: LevelFlowConfig = {
  gameId: GAME_ID,
  title: uiText.title,
  scenes: SCENES,
  levels: LEVELS,
  partyLines: {
    chomp: chompLines.levelComplete,
    waddles: waddlesLines.levelComplete,
    hops: hopsLines.levelComplete,
    record: recordPraise,
    bestScore: bestScorePraise,
  },
};
