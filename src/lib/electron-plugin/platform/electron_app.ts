import * as electron from 'electron';
import {ElectronMessageBus, ElectronMessageBusSink, ElectronMessageBusSource, ELECTRON_READY} from './electron_message_bus';
import {ELECTRON_APP_APPLICATION_COMMON, ELECTRON_APP_PLATFORM} from './electron_app_common';
import {NgZone} from 'angular2/src/core/zone/ng_zone';
import {Type, CONST_EXPR, isPresent} from 'angular2/src/facade/lang';
import {Provider} from 'angular2/src/core/di';
import {Parse5DomAdapter} from 'angular2/src/platform/server/parse5_adapter';
import {APP_INITIALIZER, platform, ComponentRef} from 'angular2/core';
import {MessageBus} from 'angular2/src/web_workers/shared/message_bus';
import {COMPILER_PROVIDERS} from 'angular2/src/compiler/compiler';

export const ELECTRON_APP_APPLICATION: Array<any /*Type | Provider | any[]*/> = [
  ELECTRON_APP_APPLICATION_COMMON,
  COMPILER_PROVIDERS,
  new Provider(MessageBus, { useFactory: createMessageBus, deps: [NgZone] }),
  new Provider(APP_INITIALIZER, { useValue: () => {}, multi: true })
];

let applicationRef:Electron.BrowserWindow;

function createMessageBus(zone: NgZone): MessageBus {
  let sink = new ElectronMessageBusSink(applicationRef.webContents);
  let source = new ElectronMessageBusSource(electron.ipcMain);
  let bus = new ElectronMessageBus(sink, source);
  bus.attachToZone(zone);
  return bus;
}

function waitForAppReady(){
  return new Promise((resolve, reject) => {
    electron.app.on('ready', resolve);
  });
}

function waitForPingback(){
  initializeMainWindow()
  return new Promise((resolve) => {
    electron.ipcMain.once(ELECTRON_READY, (ev) => {
      ev.returnValue = 'ok';
      resolve();
    });
  });
}

function initializeMainWindow(){
  applicationRef = new electron.BrowserWindow();
  applicationRef.loadURL(`file://${process.cwd()}/${process.env.DESKTOP_DIST_DIR}index.html`);
}

export function bootstrap(appComp, providers?:any) {
  Parse5DomAdapter.makeCurrent();
  
  return platform([ ELECTRON_APP_PLATFORM ])
	  .asyncApplication((z) => {
      return z.run(() => {
        return waitForAppReady()
          .then(waitForPingback)
          .then(() => {
             return ELECTRON_APP_APPLICATION;
          })
      })
    })
	  .then((appRef) => {
      return appRef.bootstrap(appComp);
    })

}
