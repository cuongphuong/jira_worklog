/*global chrome*/

document.addEventListener('DOMContentLoaded', function() {
    var optionBnt = document.getElementById("option_id");
    optionBnt.addEventListener('click', function() {
        chrome.tabs.create({ active: true, url: 'options.html' }, null);
    });
});