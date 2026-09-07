/* eslint-env jest */
// React 19 exige esta flag para que act() funcione fora do react-dom test utils.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
