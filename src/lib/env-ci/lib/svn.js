const execa = require('execa');

function head(options)
{
	try {
		return execa.sync('svn', ['info']).stdout;
	}
    catch (error) {
		return undefined;
	}
}

function branch(options)
{
	try {
        let branch;
        const svnInfo = execa.sync('svn', ['info']).stdout.replace(/^\(|\)$/g, ''),
              part = svnInfo ? svnInfo.split('Relative URL:')[1] : undefined;
        if (part)
        {
            const branchLine = part.substring(0, part.indexOf("\n")).replace(/[\r\n]+/g, ''),
                  branchParts = branchLine.split("/");
            branch = branchParts[branchParts.length - 1];
        }
        return branch ? branch : 'trunk';
	}
    catch (error) {
		return undefined;
	}
}

module.exports = {head, branch};
