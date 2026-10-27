/** Praise banks for Greater or Less. {greater} and {less} are the round's numbers. */

export const strategyPraise: readonly string[] = [
  'You checked the tens first, genius!',
  'You looked at the tens! That is the secret!',
  'You pictured the number line! Smart!',
  'You thought about how far along it is. Brilliant!',
  'You compared the tens like a pro!',
  'Tens first! That is exactly how mathematicians do it!',
  'You used your number line brain!',
  'You knew which one goes farther. Wow!',
  'You looked carefully before tapping. Super smart!',
  'You did not get tricked by the ones! Amazing!',
  'You compared them like a scientist!',
  'Big brain move! You checked the tens!',
  'You thought it through! That is real math!',
  'You saw which one is farther along. Excellent!',
  'You know your tens! Fantastic!',
  'That is some top-notch number thinking!',
];

export const effortPraise: readonly string[] = [
  'You never give up!',
  'You are working so hard!',
  'Your brain is growing right now!',
  'You keep getting better and better!',
  'I love how hard you are thinking!',
  'You are a super learner!',
  'Look at you go!',
  'You are practicing like a champion!',
  'Every try makes your brain stronger!',
  'You are focused like a laser!',
  'You are doing awesome work!',
  'Great thinking! Keep it up!',
  'You are on a roll!',
  'That was careful work. Nice!',
];

export const goofyPraise: readonly string[] = [
  'That answer was so good Chomp\'s teeth fell out!',
  'So smart, Waddles\' glasses exploded! Into confetti!',
  'Hops jumped so high he is now in outer space!',
  'That was so correct a cloud started clapping!',
  'Your brain is so sparkly I need sunglasses!',
  'Correct! A banana somewhere just did a backflip!',
  'So good! The swamp fish are doing the wave!',
  'Wow! Even the dragonflies are cheering!',
  'That answer smells like victory! And pickles!',
  'Your math is so good, my socks flew off! I do not wear socks!',
  'Correct! A dinosaur somewhere is very proud of you!',
  'Ding ding ding! The genius alarm is going off!',
  'That was so right, the lily pads are dancing!',
  'Hooray! I am throwing pretend confetti! Whoosh!',
  'Correct! Somebody give this kid a giant trophy!',
  'Your answer just won the Swamp Olympics!',
];

/** For a correct answer after a hint. Celebrates using the number line. */
export const recoveryPraise: readonly string[] = [
  'You used the number line like a pro!',
  'You kept trying and got it!',
  'The number line helped, and you figured it out!',
  'That is how it is done! Look, think, and try again!',
  'You learned it and nailed it!',
  'You watched the hops and got it right!',
  'Super comeback! You used the number line!',
  'You never give up! That is amazing!',
  'Trying again is a superpower, and you have it!',
  'You checked the number line like a scientist!',
  'Way to go! Mistakes help us learn!',
  'You got it! Your brain just grew a little!',
  'Look at that! You used the number line to figure it out!',
  'Comeback champion!',
  'That is what real mathematicians do: check and try again!',
];

export const recordPraise: readonly string[] = [
  'New record streak! {n} in a row!',
  'That is your best streak ever! {n}!',
  'Whoa! A brand new record: {n} in a row!',
  'Personal best! {n} in a row!',
  'Record breaker! {n} in a row!',
  'You beat your best streak! {n}!',
  'New high streak! {n} in a row! Amazing!',
  'History made! {n} in a row!',
];

export const bestScorePraise: readonly string[] = [
  'You beat your best score!',
  'New best score on this level!',
  'That is your highest score ever here!',
  'Best score yet! Woo hoo!',
  'You got even better than last time!',
];

/** The hint's closing line, after both numbers are on the line. */
export const hintConclusion: readonly string[] = [
  'Look how far {greater} is! Farther along means greater!',
  '{greater} is farther along, so {greater} is greater!',
  'See? {less} is closer to zero. {less} is less!',
  '{greater} went farther! {greater} is greater than {less}!',
  'Farther along means greater. {greater} wins the race!',
  '{less} did not go as far, so {less} is less than {greater}!',
  'Look! {greater} is way out there. That means greater!',
  'Closer to zero is less. Farther along is greater!',
];
