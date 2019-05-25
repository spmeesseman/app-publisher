param ( 

$TEXT = "",
$HEADERREGEX = @(),
$SUBHEADERREGEX = @()

)

#
# Make sure user entered correct cmd line params
#
if ([string]::IsNullOrEmpty($TEXT)) {
    Log-Message "Error: No text specified" "red"
    exit 1;
}

$Markdown = $TEXT;

#
# Find the line break style
#
# $LineSeperator = "`n"
# if ($TEXT.Contains("`r`n")) {
#     $LineSeperator = "`r`n"
# }
#
# Break specified text up into lines
#
# $TextLines = $TEXT.Split($LineSeperator);
# 
# 
# 
# foreach ($TextLine in $TextLines)
# {
#     [Match] $match = [Regex]::Match($TextLine, $HEADERREGEX);
#     while ($match.Success) {
#         if ($match.Value.Contains("`r`n`r`n")) { # ps regex is buggy on [\r\n]{2}
#             $COMMITS = $COMMITS.Replace($match.Value, $match.Value.ToUpper())
#         }
#         $match = $match.NextMatch()
#     }
# 
#     $Markdown += $TextLine;
#     $Markdown += $LineSeperator
# }

[Match] $match = [Regex]::Match($Markdown, $HEADERREGEX);
while ($match.Success) {
    $Markdown = $Markdown.Replace($match.Value, "## " + $match.Value)
    $match = $match.NextMatch()
}

[Match] $match = [Regex]::Match($Markdown, $SUBHEADERREGEX);
while ($match.Success) {
    $Markdown = $Markdown.Replace($match.Value, "### " + $match.Value)
    $match = $match.NextMatch()
}

#
# Numbered List
#
[Match] $match = [Regex]::Match($Markdown,"[1-9]+[.]\s+");
while ($match.Success) {
    $Markdown = $Markdown.Replace($match.Value, "- " + $match.Value)
    $match = $match.NextMatch()
}

return $Markdown
