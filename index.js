/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import ProcessSmsTask from './src/tasks/ProcessSmsTask';

AppRegistry.registerComponent(appName, () => App);

// Register headless task for background SMS processing
AppRegistry.registerHeadlessTask('ProcessSmsTask', () => ProcessSmsTask);
