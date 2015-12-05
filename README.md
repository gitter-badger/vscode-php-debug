# vscode-php-debug

[![Join the chat at https://gitter.im/cmpaul/vscode-php-debug](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/cmpaul/vscode-php-debug?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
A debug extension to add xDebug support to Visual Studio Code

## NOTE
This is a side project I started for fun and *is not yet fully functional*, so if you're interested in adding xDebug support to Visual Studio Code and would like to contribute, please feel free!

### Installation

I had to manually build/transpile to the `out/` directory using CLI (am probably doing this incorrectly):
```bash
npm install
gulp build
```
Once the `out/` directory is generated, I can debug the extension and trigger the interception of DBGP messages by running `php-debug-server` and placing breakpoints in the source.

For more information, see:
- https://code.visualstudio.com/docs/extensions/example-debuggers
- https://code.visualstudio.com/docs/extensionAPI/api-debugging


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/cmpaul/vscode-php-debug/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

