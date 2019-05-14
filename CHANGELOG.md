# Change Log

## [1.1.4](https://github.com/spmeesseman/app-publisher/compare/v1.1.3...v1.1.4) (2019-05-14)


### Bug Fixes

* env var placeholder in publishrc not replaced at runtime ([b4e1cc2](https://github.com/spmeesseman/app-publisher/commit/b4e1cc2))


### Build System

* **app-publisher:** add build command to publishrc [skip ci] ([abb0801](https://github.com/spmeesseman/app-publisher/commit/abb0801))
* **npm:** remove shelljs dep, add person and repo info [skip ci] ([2314d45](https://github.com/spmeesseman/app-publisher/commit/2314d45))
* **npm:** remove watch script command [skip ci] ([b1a761c](https://github.com/spmeesseman/app-publisher/commit/b1a761c))


### Code Refactoring

* re-add git repo tag used by semantic-release ([68a07d4](https://github.com/spmeesseman/app-publisher/commit/68a07d4))

## [1.1.3](https://github.com/spmeesseman/app-publisher/compare/v1.1.2...v1.1.3) (2019-05-13)


### Bug Fixes

* environment variable placeholders do not get replaced when config file is read in ([1b7af97](https://github.com/spmeesseman/app-publisher/commit/1b7af97))


### Code Refactoring

* add file logging ([d68ad00](https://github.com/spmeesseman/app-publisher/commit/d68ad00))
* add npm scope to config ([099af0d](https://github.com/spmeesseman/app-publisher/commit/099af0d))

## [1.1.2](https://github.com/spmeesseman/app-publisher/compare/v1.1.1...v1.1.2) (2019-05-13)


### Bug Fixes

* dual install type installer/npm is sending two deparate emails ([d5fc571](https://github.com/spmeesseman/app-publisher/commit/d5fc571))


### Code Refactoring

* allow same release on semantic-release due to integration with pj svn ([feef3bb](https://github.com/spmeesseman/app-publisher/commit/feef3bb))

## [1.1.1](https://github.com/spmeesseman/app-publisher/compare/v1.1.0...v1.1.1) (2019-05-13)


### Code Refactoring

* remove shelljs dependency, use node.child_process ([42b4351](https://github.com/spmeesseman/app-publisher/commit/42b4351))

# [1.1.0](https://github.com/spmeesseman/app-publisher/compare/v1.0.11...v1.1.0) (2019-05-13)


### Bug Fixes

* a file called 0 is being created when ps script is run and deployscript config is empty ([4d4ff3e](https://github.com/spmeesseman/app-publisher/commit/4d4ff3e))


### Features

* ps1 pj publish launch from nodejs ([871e529](https://github.com/spmeesseman/app-publisher/commit/871e529))

## [1.0.11](https://github.com/spmeesseman/app-publisher/compare/v1.0.10...v1.0.11) (2019-05-13)


### Bug Fixes

* another try to locate ps1 script properly ([0f7fae0](https://github.com/spmeesseman/app-publisher/commit/0f7fae0))

## [1.0.10](https://github.com/spmeesseman/app-publisher/compare/v1.0.9...v1.0.10) (2019-05-13)


### Bug Fixes

* still not finding ps1 script path for local installs ([50ed98b](https://github.com/spmeesseman/app-publisher/commit/50ed98b))

## [1.0.9](https://github.com/spmeesseman/app-publisher/compare/v1.0.8...v1.0.9) (2019-05-13)


### Bug Fixes

* find correct ps1 script before running exec ([46767f5](https://github.com/spmeesseman/app-publisher/commit/46767f5))

## [1.0.8](https://github.com/spmeesseman/app-publisher/compare/v1.0.7...v1.0.8) (2019-05-13)


### Bug Fixes

* dev dir run doesnt work ([6b9f9f1](https://github.com/spmeesseman/app-publisher/commit/6b9f9f1))

## [1.0.7](https://github.com/spmeesseman/app-publisher/compare/v1.0.6...v1.0.7) (2019-05-13)


### Bug Fixes

* perryjohnson scoped package does not launch ps script ([a1b26bd](https://github.com/spmeesseman/app-publisher/commit/a1b26bd))

## [1.0.6](https://github.com/spmeesseman/app-publisher/compare/v1.0.5...v1.0.6) (2019-05-13)


### Bug Fixes

* stdin doesnt work during ps script run ([1fcf5fd](https://github.com/spmeesseman/app-publisher/commit/1fcf5fd))

## [1.0.5](https://github.com/spmeesseman/app-publisher/compare/v1.0.4...v1.0.5) (2019-05-13)


### Bug Fixes

* if history file directory doesnt already exist, ps script fails ([1f88b80](https://github.com/spmeesseman/app-publisher/commit/1f88b80))
* setting empty values in config file causes ps script to fail ([6bf8030](https://github.com/spmeesseman/app-publisher/commit/6bf8030))

## [1.0.4](https://github.com/spmeesseman/app-publisher/compare/v1.0.3...v1.0.4) (2019-05-13)


### Bug Fixes

* format ps args not passing to ps ([01575a4](https://github.com/spmeesseman/app-publisher/commit/01575a4))

## [1.0.3](https://github.com/spmeesseman/app-publisher/compare/v1.0.2...v1.0.3) (2019-05-12)


### Bug Fixes

* script array property in config file is not parsed correctly ([7f128a2](https://github.com/spmeesseman/app-publisher/commit/7f128a2))

## [1.0.2](https://github.com/spmeesseman/app-publisher/compare/v1.0.1...v1.0.2) (2019-05-12)


### Bug Fixes

* dry-run flag causes an error ([fe68f60](https://github.com/spmeesseman/app-publisher/commit/fe68f60))

## [1.0.1](https://github.com/spmeesseman/app-publisher/compare/v1.0.0...v1.0.1) (2019-05-12)


### Bug Fixes

* launch powershell task on pj publish ([0fc1e21](https://github.com/spmeesseman/app-publisher/commit/0fc1e21))
* launch powershell task on pj publish ([356219b](https://github.com/spmeesseman/app-publisher/commit/356219b))

# 1.0.0 (2019-05-11)


### Bug Fixes

* launch ps1 on command ([9cb2c0d](https://github.com/spmeesseman/app-publisher/commit/9cb2c0d))


### Build System

* **npm:** add shelljs to launch ps1 script ([5812b84](https://github.com/spmeesseman/app-publisher/commit/5812b84))
* **npm:** update ([35a0e7d](https://github.com/spmeesseman/app-publisher/commit/35a0e7d))


### Features

* initial check in ([0865e24](https://github.com/spmeesseman/app-publisher/commit/0865e24))


### Minor Features

* output success/failure after writing version to file ([030d4a8](https://github.com/spmeesseman/app-publisher/commit/030d4a8))
