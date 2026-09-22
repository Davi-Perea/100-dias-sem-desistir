/* eslint-env jest */
// React 19 exige esta flag para que act() funcione fora do react-dom test utils.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4 no Jest: sem módulo nativo, o react-native-worklets precisa do mock
// dele antes do mock do Reanimated. O mock oficial não traz useReducedMotion; o
// projeto respeita "Reduzir movimento" pelo hook do tema (src/ui/theme.ts), então
// aqui o hook do Reanimated só devolve false. Suítes podem sobrescrever com jest.mock.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
