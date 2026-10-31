/** Praise banks for Ordering Numbers. */

/** Strategy praise: names what he did right (places, looking from the left, empty hundreds). */
export const strategyPraise: readonly string[] = [
  'You checked the hundreds first, genius!',
  'You looked at the places! That is the secret!',
  'You did not get tricked by the first digit!',
  'You knew a two-digit number has no hundreds!',
  'You compared from the left like a pro!',
  'Hundreds first! That is exactly how mathematicians do it!',
  'You found the greatest one left. Smart!',
  'You lined them up in your brain!',
  'You looked carefully before tapping. Super smart!',
  'Ones under ones! You know the trick!',
  'You compared them like a scientist!',
  'Big brain move! You checked the places!',
  'You thought it through! That is real math!',
  'You know your hundreds, tens, and ones!',
  'That is some top-notch number thinking!',
  'You checked every number. Excellent!',
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
  'You are sorting like a superstar!',
];

export const goofyPraise: readonly string[] = [
  'That pick was so good Chomp\'s teeth fell out!',
  'So smart, Waddles\' glasses exploded! Into confetti!',
  'Hops jumped so high he is now in outer space!',
  'That was so correct a cloud started clapping!',
  'Your brain is so sparkly I need sunglasses!',
  'Correct! A banana somewhere just did a backflip!',
  'So good! The swamp fish are doing the wave!',
  'Wow! Even the dragonflies are cheering!',
  'That answer smells like victory! And pickles!',
  'Correct! A dinosaur somewhere is very proud of you!',
  'Ding ding ding! The genius alarm is going off!',
  'That was so right, the lily pads are dancing!',
  'Hooray! I am throwing pretend confetti! Whoosh!',
  'Correct! Somebody give this kid a giant trophy!',
  'Your answer just won the Swamp Olympics!',
];

/** A correct pick after a hint. Celebrates using the places. */
export const recoveryPraise: readonly string[] = [
  'You used the place chart like a pro!',
  'You kept trying and got it!',
  'You checked the places and figured it out!',
  'That is how it is done! Look, think, and try again!',
  'You learned it and nailed it!',
  'Super comeback! You looked at the hundreds!',
  'You never give up! That is amazing!',
  'Trying again is a superpower, and you have it!',
  'You checked the places like a scientist!',
  'Way to go! Mistakes help us learn!',
  'You got it! Your brain just grew a little!',
  'Comeback champion!',
  'That is what real mathematicians do: check and try again!',
  'You looked from the left and found it!',
  'You figured out the tricky one!',
];

/** Spoken while he taps the last card. */
export const lastCardLines: readonly string[] = [
  'The last one is the least! Tap it!',
  'Only one left! It must be the least! Tap it!',
  'One more! The least number goes at the end!',
  'Last one! That is the least! Tap it!',
  'The least number goes on the right! Tap it!',
];

/** After the last card lands. */
export const leastPraise: readonly string[] = [
  'And that is the least!',
  'The least one, right at the end!',
  'Least on the right! Perfect!',
  'And the least one goes last!',
  'There is the least number!',
];

/** Arrange mode: some cards were right. */
export const keptPraise: readonly string[] = [
  'These ones are perfect! Let us fix the rest.',
  'Great job on these! Just a couple to fix.',
  'Some are already right! Let us look at the others.',
  'Those are in the right spot! Let us check the rest.',
  'Nice! These stay. Let us fix the others together.',
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

/**
 * Praise that names the trick he just beat. {greater} is his pick, {less} the number that could have fooled him.
 * 'second' has a two-digit version, where the tens match and the ones decide.
 */
export const pitfallPraise: Record<string, readonly string[]> = {
  'digit-trap': [
    'You were not fooled by {less}! It has 0 hundreds!',
    'Ha! {less} tried to trick you, but {greater} has hundreds!',
    'Sneaky trap dodged! {greater} has hundreds, and {less} has none!',
    'You knew {less} has 0 hundreds! Genius!',
    'The big digit in {less} did not fool you! It is only in the tens place!',
    'Trap buster! {greater} is greater than {less}!',
  ],
  'single-digit': [
    '{less} has just one digit! You knew it was less than {greater}!',
    'You knew {less} has 0 hundreds and 0 tens! Brilliant!',
    'One little digit cannot trick you!',
    '{greater} is greater than {less}, and you knew it! Wow!',
  ],
  zero: [
    'You saw the zero holding a place! Amazing!',
    'Zeros cannot trick you! {greater} is greater than {less}!',
    'You knew zero means none in that place! Smart!',
    'Zero hero! You compared {greater} and {less} perfectly!',
  ],
  twins: [
    'Same digits, different places! You figured it out!',
    '{greater} and {less} look like twins, but you knew {greater} is greater!',
    'You checked which digit is in each place! Brilliant!',
    'Shuffled digits cannot fool you!',
  ],
  third: [
    'Same hundreds, same tens, so you checked the ones! Super detective!',
    'You looked all the way to the ones place! Wow!',
    '{greater} and {less} were so close, and you still got it!',
    'Ones place detective! {greater} is greater than {less}!',
  ],
  second: [
    'Same hundreds, so you checked the tens! Exactly right!',
    'You looked at the next place! That is how mathematicians do it!',
    '{greater} beats {less} in the tens place! You saw it!',
    'The hundreds were the same, so you kept looking! Smart!',
  ],
  second2: [
    'Same tens, so you checked the ones! Exactly right!',
    'You looked at the ones place! Smart!',
    '{greater} beats {less} in the ones place! You saw it!',
    'The tens were the same, so you kept looking! Brilliant!',
  ],
  'digit-count': [
    '{greater} has three digits! You knew it was greater!',
    'Three digits is greater than two digits! You got it!',
    'You counted the places! Excellent!',
    'Hundreds win! {greater} is greater than {less}!',
  ],
};

/** Shouted by everyone when a round is done. */
export const partyShouts: readonly string[] = [
  'Dance party!',
  'Woo hoo!',
  'Hooray!',
  'Yippee!',
  'Let us boogie!',
  'Party time!',
  'Wiggle wiggle!',
  'Shake it!',
];
