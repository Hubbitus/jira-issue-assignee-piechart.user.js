jira-issue-assignee-piechart.user.js
====================================

[Jira](https://www.atlassian.com/software/jira) user.js browser extension for draw pie chart of assign history.

[User.js or userjs](http://wiki.greasespot.net/User_script) script for add functionality analyze assignees participation in current issue.

Compatability
=============
Script primary written for [Chromium](http://www.chromium.org/Home) browser and off course should work with [Google Chrome](https://www.google.ru/chrome/browser/desktop/).

With [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) extension it also supported in [Firefox](https://www.mozilla.org/firefox/).

Other browsers also may support that, but it is not intended and not tested. If someone need it, and it is not work, please file a ticket. For required extensions please look for example at http://wiki.greasespot.net/Cross-browser_userscripting and http://userscripts.ru/ (in Russian).

Installation
============
Just go to [link](https://github.com/Hubbitus/jira-issue-assignee-piechart.user.js/raw/master/jira-issue-assignee-piechart.user.js]). Browser should ask you permission install it.

What it does and how works
==========================
Based on [google visialisation API](https://developers.google.com/chart/) and [Jira REST API](https://docs.atlassian.com/jira/REST/latest/) it should work in almost all versions and sites.

Examples by issue https://jira.atlassian.com/browse/JRA-31917

* Once it installed it automatically adds button in dates block: ![add button in dates block](https://raw.githubusercontent.com/Hubbitus/jira-issue-assignee-piechart.user.js/master/screenshots/jira-issue-assignee-piechart.user.js-button.png).
* By click, it retrieves full issue changelog and draw chart by each assegment: ![chart by each assignment](https://raw.githubusercontent.com/Hubbitus/jira-issue-assignee-piechart.user.js/master/screenshots/jira-issue-assignee-piechart.user.js-chart.png)
* and summary time by assignee: ![summary time by assignee chart](https://raw.githubusercontent.com/Hubbitus/jira-issue-assignee-piechart.user.js/master/screenshots/jira-issue-assignee-piechart.user.js-charts.png)


License
=======
Script licensed under GNU GPLv3 license without any warranty. Please look at LICENSE file for full text.
