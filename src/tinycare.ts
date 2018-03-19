"use strict";

import {
  TextEditor,
  TextDocument,
  ExtensionContext,
  window,
  commands,
  EventEmitter,
  workspace
} from "vscode";
import { Tinycare, emitCanStartTimer, emitBreakTaken } from "tinycare";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { takeUntil, delay } from "rxjs/operators";
import "rxjs/add/observable/of";
import "rxjs/add/operator/do";

function dev(fn) {
  return function(...args) {
    return process.env.NODE_ENV === "development" && fn.apply(null, args);
  };
}

const log = dev(console.log);

export function activate(context: ExtensionContext) {
  log('Congratulations, your extension "tinycare" is now active!');

  const config = workspace.getConfiguration("tinycare");
  const open$ = new Subject();

  try {
    Tinycare({
      twitter: {
        consumerKey: config.twitter_consumer_key,
        consumerSecret: config.twitter_consumer_secret,
        accessToken: config.twitter_access_token,
        accessSecret: config.twitter_access_token_secret
      },
      onCareNotification: ({ text: message, bot }) =>
        window.showInformationMessage(`${bot}: ${message}`)
    });
  } catch (e) {
    window.showErrorMessage(
      "You may be missing some of the Twitter configuration. Please open up the settings and add your keys."
    );
  }

  workspace.onDidOpenTextDocument(() => {
    log(
      `Opened document. Now have: ${
        workspace.textDocuments.length
      } open document(s).`
    );

    open$.next(workspace.textDocuments.length);

    emitCanStartTimer(
      (log("emitCanStartTimer"), workspace.textDocuments.length > 0)
    );
  });

  workspace.onDidCloseTextDocument(() => {
    log(
      `Closed document. Now have: ${
        workspace.textDocuments.length
      } open document(s).`
    );

    !window.activeTextEditor &&
      workspace.textDocuments.length < 1 &&
      Observable.of(() => (log("Break Taken!"), emitBreakTaken(true)))
        .do(log)
        .pipe(delay(config.break_time * (60 * 1000)))
        .pipe(
          takeUntil(
            open$.do(count => log(`Cancelling with ${count} open editors`))
          )
        )
        .subscribe(fn => fn());
  });
}

export function deactivate() {}
