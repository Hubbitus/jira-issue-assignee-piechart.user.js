// ==UserScript==
// @name         jira-issue-assignee-piechart
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Jira user.js browser extension for draw pie chart of JIRA issue assign history. See https://github.com/Hubbitus/jira-issue-assignee-piechart.user.js
// @author       Pavel Alexeev <Pavel_Alexeev@epam.com>
// @include      /^https?:\/\/jira\..+?\/browse\/[A-Z0-9]+-\d+$/
// @updateURL    https://github.com/Hubbitus/jira-issue-assignee-piechart.user.js/raw/master/jira-issue-assignee-piechart.user.js
// @downloadURL  https://github.com/Hubbitus/jira-issue-assignee-piechart.user.js/raw/master/jira-issue-assignee-piechart.user.js
// ==/UserScript==


function addJQuery(callback) {
	console.log('[jira-issue-assignee-piechart] addJQuery function start');
	var script = document.createElement("script");
	script.setAttribute("src", "//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js");
	script.addEventListener('load', function() {
		var script = document.createElement("script");
		script.textContent = "window.jQ=jQuery.noConflict(true);(" + callback.toString() + ")();";
		document.body.appendChild(script);
	}, false);
	document.body.appendChild(script);
}

// Note, jQ replaces $ to avoid conflicts.
function main() {
console.log('[jira-issue-assignee-piechart] script start loading');
	var chartFull, data;

	/**
	* Main function to obtain data and draw chartFull
	*/
	function queryJiraDataAndDrawCharts(){
		jQ.get(
			$('meta[name=ajs-jira-base-url]').attr('content') + '/rest/api/2/search'
			,{
				jql: 'key = ' + (jQ('meta[name=ajs-issue-key]').attr('content') /* Single issue */ || jQ('div.navigator-content[data-selected-issue]').data('selected-issue').key /* Search */)
				,expand: 'changelog'
			}
			,function(res){
//				console.debug('get success: ', res)
				var assigneeChanges = jQ.grep(// Just filtered data where at least one change is assignee
					res.issues[0].changelog.histories
					,function(hist){
						return jQ.grep(
							hist.items
							,function(it){
								return 'assignee' == it.field;
							}
						).length > 0
					}
				);

				/*
				Flatten changes structure from:
					{
						author: Object{}
						created: "2014-12-10T19:03:43.545+0300"
						id: "288208"
						items: Array[3][
							0: {
								field: "assignee"
								fieldtype: "jira"
								from: "p.alexeev"
								fromString: "Алексеев Павел"
								to: "a.kravets"
								toString: "Кравец Антон"
							}
							1: {...}
							2: {...}
						]
					}
				to just items, but with 'change' ref to original object, like:
					[
						0: {
							change: {
								author: Object{…} // !!!
							}
							field: "assignee"
						…
						}
						1: {...}
						2: {...}
					]
				*/
				assigneeChanges = jQ.grep( // Grep may be combined with assigneeChanges construction, but it also allow have full structures of change items too
					jQ.map(
						assigneeChanges
						,function(change){
							jQ.map(// Add parents change ref
								change.items
								,function(item){
									item.change = change;
								}
							);
							return change.items;
						}
					)
					,function(changeItem){ //filter
						return 'assignee' == changeItem.field;
					}
				);

				var assigneeRanges = [];
				jQ(assigneeChanges).each(function(i){
					if (0 == i){ // First should be handled separately - from by task create date and to by first reassign
						assigneeRanges.push({
							assignee: this.fromString
							,from: new Date(res.issues[0].fields.created) // issue create task
							,to: new Date(this.change.created)
						});
						assigneeRanges.push({// Second on what assign
							assignee: this.toString
							,from: new Date(this.change.created)
						});
					}
					else{
						if(i > 0) // Close previous except first
							jQ(assigneeRanges).get(-1).to = new Date(this.change.created);
						// Rest regular assignments: create new, close previous
						assigneeRanges.push({
							assignee: this.toString
							,from: new Date(this.change.created)
						});
					}
				});
				if (0 == assigneeRanges.length){ // Special case - issue never has been assigned
					assigneeRanges.push({
						assignee: res.issues[0].fields.assignee.displayName // Current assignee, no any history
						,from: new Date(res.issues[0].fields.created) // issue create task
						,to: ( res.issues[0].fields.resolutiondate ? new Date(res.issues[0].fields.resolutiondate) : new Date() ) // resolution date
					});
				}
				else{
					// Last - end by task resolution date
					jQ(assigneeRanges).get(-1).to = ( res.issues[0].fields.resolutiondate ? new Date(res.issues[0].fields.resolutiondate) : new Date() ) // resolution date
				}

				jQ.getScript(
					'https://www.google.com/jsapi'
					,function(){
						google.load(
							'visualization'
							,'1'
							,{
								packages: ['corechart']
								,callback: function (){
									//https://developers.google.com/chart/interactive/docs/datatables_dataviews
									var dataFull = new google.visualization.DataTable();
									dataFull.addColumn('string', 'Assignee'); // Implicit domain label col.
									dataFull.addColumn('number', 'Spent time'); // Implicit series 1 data col.
									dataFull.addColumn({type:'string', role:'annotationText'}); // annotationText col.
									jQ(assigneeRanges).each(
										function(){
											dataFull.addRow(
												[
													this.assignee
													,+((this.to.getTime() - this.from.getTime()) / 60 / 60 / 1000).toFixed(2) // + required - http://stackoverflow.com/a/12830454/307525
													// http://momentjs.com/docs/#/displaying/from/
													,'<div class="time-spent"><i>Spent time</i>:' +
													 '<br/>from: ' + moment(this.from).format('YYYY-MM-DD HH:mm:ss') +
													 '<br/>to: ' + (moment(this.from).format('YYYY-MM-DD') == moment(this.to).format('YYYY-MM-DD') ? moment(this.to).format('[           ]HH:mm:ss') : moment(this.to).format('[<u>]YYYY-MM-DD[</u>] HH:mm:ss')) + '</div>' +
													 '<div class="time-spent"><i>Spent</i>: ' + moment(this.to).from(this.from, true) + '</div>'
												]
											);
										}
									);

									// https://groups.google.com/forum/#!msg/google-visualization-api/Z8Q8HNkxSwg/ZCcELjR3roAJ
									var dataSum = google.visualization.data.group(
										dataFull
										,[0]
										,[
											{'column': 1, 'aggregation': google.visualization.data.sum, 'type': 'number'}
											,{'column': 1, 'aggregation': function(values){ // Calculate readable totals
												return '<div>Count of assignments: ' + values.length + '</div>' +
													'<div class="time-spent"><i>Всего</i>: ' + moment().subtract(values.reduce(function(a, b){ return a + b}, 0), 'hour').fromNow(true) + '</div>';
											}, 'type': 'string'}
										]
									);

									var options = {
										title: 'Chronology of assignments'
										,pieHole: 0.5
										,tooltip: {
											isHtml: true // https://gist.github.com/alexrainman/bb8d49357250df0859c0 ( http://stackoverflow.com/a/27243588/307525 )
										}
										,chartArea: {width: '95%', height: '80%'} //http://stackoverflow.com/questions/9661456/remove-padding-or-margins-from-google-charts
										,legend: {
											position: 'bottom'
											,maxLines: 3
										}
									};
									var optionsSum = jQ.extend({}, options);
									optionsSum.title = 'Total spent time by assignee';

									function chartTooltipFill(tooltipSelector, tooltipText){
										jQ(tooltipSelector + ' .google-visualization-tooltip-item-list li:eq(0)').css('font-weight', 'bold');
										jQ(tooltipSelector + ' .google-visualization-tooltip-item-list').append(jQ('<li class="google-visualization-tooltip-item"></li>').html(tooltipText));
										jQ(tooltipSelector + ' .google-visualization-tooltip-item-list').parent().css({'height': 'auto', 'width': 'auto', 'white-space': 'nowrap'}) // By some reason wight/height was fixed
										jQ(tooltipSelector + ' .google-visualization-tooltip-item-list .time-spent').css('text-align', 'right')
										jQ(tooltipSelector + ' .google-visualization-tooltip-item').css({padding: '0.2em', margin: '0.2em'})
									}

									var chartSize = Math.ceil(( jQ('#datesmodule').width() * 0.5 ));
									var chartStyle = 'height: ' + chartSize + 'px; width: ' + chartSize + 'px; border: 1px solid #ccc; padding: 0 0 2em; margin: 0;';

									var container = jQ('<div id="assignee-piechart" style="display: flex"></div>').appendTo(jQ('#datesmodule')); // Common container for flex layout

									// Chart by all assignments
									// Bottom padding needed for extended tooltip we are using before
									var chartFull = new google.visualization.PieChart( (jQ('#assignees_chart_full')[0] || jQ('<div id="assignees_chart_full" style="' + chartStyle + '">Loading assignee pie chart full</div>').appendTo(container)[0]) );
									// Custom PieChart tooltip based on https://gist.github.com/alexrainman/bb8d49357250df0859c0 ( http://stackoverflow.com/a/27243588/307525 )
									// https://developers.google.com/chart/interactive/docs/basic_interactivity
									google.visualization.events.addListener(chartFull, 'onmouseover', function(e){
//										chartFull.setSelection([e]);
										chartTooltipFill('#assignees_chart_full', dataFull.getValue(e.row, 2));
									});
									google.visualization.events.addListener(chartFull, 'select', function(e){
										chartTooltipFill('#assignees_chart_full', dataFull.getValue(chartFull.getSelection()[0].row, 2));
									});
									chartFull.draw(dataFull, options);

									// Chart by sum spent time on issue by assignee.
									var chartSum = new google.visualization.PieChart( (jQ('#assignees_chart_sum')[0] || jQ('<div id="assignees_chart_sum" style="' + chartStyle + '">Loading assignee pie chart sum</div>').appendTo(container)[0]) );
									google.visualization.events.addListener(chartSum, 'onmouseover', function(e){
//										chartSum.setSelection([e]);
										chartTooltipFill('#assignees_chart_sum', dataSum.getValue(e.row, 2));
									});
									chartSum.draw(dataSum, optionsSum);
								}
							}
						);
					}
				);
			}
		);
	}

	jQ('#datesmodule').append(
		jQ('<button style="border: 2px solid silver; border-radius: 11px; width: 100%;">Draw assigners time charts</button>').click(
			function(){
				console.log('Lets draw!');
				queryJiraDataAndDrawCharts();
			}
		)
	);


console.log('User.js script done');
}

// load jQuery and execute the main function
addJQuery(main);