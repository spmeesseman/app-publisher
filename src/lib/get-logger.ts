import * as signale from "signale";
import figures from "figures";

export = getLogger;

function getLogger({stdout, stderr})
{
  return new signale.Signale({
      config: {displayTimestamp: true, underlineMessage: false, displayLabel: false},
      disabled: false,
      interactive: false,
      scope: "app-publisher",
      stream: stdout,
      types: {
        error: {badge: figures.cross, color: "red", label: ""}, // stream: [stderr]},
        log: {badge: figures.info, color: "magenta", label: ""}, // stream: [stdout]},
        success: {badge: figures.tick, color: "green", label: ""} // stream: [stdout]},
      },
  });
}
