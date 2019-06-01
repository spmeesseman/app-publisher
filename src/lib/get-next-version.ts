import * as semver from 'semver';
import {FIRST_RELEASE} from './definitions/constants';

export = getNextVersion;

function getNextVersion({nextRelease: {type}, lastRelease, logger})
{
  let version;
  if (lastRelease.version) {
    version = semver.inc(lastRelease.version, type);
    logger.log(`The next release version is ${version}`);
  } else {
    version = FIRST_RELEASE;
    logger.log(`There is no previous release, the next release version is ${version}`);
  }

  return version;
}
