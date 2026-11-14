// Startup wrapper: if loading the app throws, show the error on screen instead of a blank window.
const React = require('react');
const { AppRegistry, ScrollView, Text } = require('react-native');

try {
  require('expo-router/entry');
} catch (e) {
  const msg = String((e && e.message) || e);
  const stack = String((e && e.stack) || '').slice(0, 1800);
  AppRegistry.registerComponent('main', () => () =>
    React.createElement(
      ScrollView,
      { style: { flex: 1, backgroundColor: '#fff' }, contentContainerStyle: { padding: 24, paddingTop: 80 } },
      React.createElement(Text, { style: { fontSize: 20, fontWeight: '800', color: '#12324A' } }, 'AquaPulse failed to start'),
      React.createElement(Text, { selectable: true, style: { marginTop: 12, color: '#D9534F' } }, msg),
      React.createElement(Text, { selectable: true, style: { marginTop: 12, color: '#6B8499', fontSize: 11 } }, stack),
    ),
  );
}
