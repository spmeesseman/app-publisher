const {head, branch} = require('../lib/svn');

module.exports = {
	configuration(options) {
		return {commit: head(options), branch: branch(options)};
	},
};
