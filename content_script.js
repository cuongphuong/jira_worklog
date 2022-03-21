/*global chrome*/

async function start() {
    let response = await new Promise((resolve, reject) => chrome.storage.local.get("worklog_status", function(res) {
        resolve(res);
    }));

    let status = "no";
    if (response && response.hasOwnProperty("worklog_status")) {
        status = response.worklog_status;
    }

    let loginForm = document.getElementById("header-details-user-fullname");
    if (!status || status !== "ready" || !loginForm) {
        return;
    }
    startImport();
}

async function startImport() {
    let worklogDataList = await loadWorklogFromCache();
    if (worklogDataList.length === 0) return;

    // Load config from cache
    let userInf = await loadLoginUserFromCache();
    let user = userInf.username;
    let pass = userInf.passwordIp;
    let jiraType = userInf.jiraType;

    // Make import view
    makeView();

    // Import
    for (let ind = 0; ind < worklogDataList.length; ind++) {
        let element = worklogDataList[ind];
        document.getElementById("progress_id").innerHTML = `${ind + 1}/${worklogDataList.length}`;

        if (element && element.status === "OK") {
            continue;
        }

        let status = "OK";
        await timeout(200);
        let res = null;

        // Create for jira 3
        if (jiraType === 'j3') {
            res = await createTimeSheet_jira3(
                user,
                pass,
                element.issue,
                element.date,
                element.datetime,
                element.time,
                element.worked,
                element.remaining,
                element.desscription,
                element.type
            ).catch(err => {
                console.log(err);
                worklogDataList[ind].detailMsg = err;
                status = "FALIL";
            });
        }

        // Create for jira 9
        if (jiraType === 'j9') {
            res = await createTimeSheet_jira9(
                user,
                pass,
                element.issue,
                element.date,
                element.datetime,
                element.time,
                element.worked,
                element.remaining,
                element.desscription,
                element.type
            ).catch(err => {
                console.log(err);
                worklogDataList[ind].detailMsg = err;
                status = "FALIL";
            });
        }
        // Trace response
        console.log("Trace response", res);

        try {
            if (!res) throw "Empty"

            // Check response
            let resText = await res.text();
            if ((res.status !== 200 && resText.includes("stack-trace")) ||
                (res.status == 200 && resText.includes("errorMessage"))) {
                status = "FALIL";
                worklogDataList[ind].detailMsg = resText;
            } else {
                worklogDataList[ind].detailMsg = " - ";
            }
        } catch (err) {
            console.log(err)
            status = "FALIL";
            worklogDataList[ind].detailMsg = "" + err;
        }

        worklogDataList[ind].status = status;
    }

    // Update finish status
    chrome.storage.local.set({ "worklog_status": "completed" }, function() {
        console.log('Value is set to ', "completed");
    });

    // Update worklog data
    chrome.storage.local.set({ "worklog_data": worklogDataList }, function() {
        chrome.runtime.sendMessage({ closeThis: true });
        chrome.runtime.sendMessage("showOptions");
    });
}

async function createTimeSheet_jira3(user, pass,
    issueKey, workDate, workDateTime, time, worked, remaining, comment, tow) {

    //Config
    let base_url = "https://jiradomain/jira3";
    workDate = workDate.replaceAll("/", "-");

    let URL = base_url + "/rest/tempo-rest/1.0/worklogs/" + issueKey;
    URL = URL + "?os_username=" + user + "&os_password=" + encodeURI(pass);
    URL = URL + "&id=&type=issue&use-ISO8061-week-numbers=false";
    URL = URL + "&selected-panel=&analytics-origin-page=JiraIssueView&analytics-origin-view=tempo-issue-panel&analytics-origin-action=click-log-work-button&startTimeEnabled=true&tracker=false&planning=false";
    URL = URL + "&preSelectedIssue=" + issueKey;
    URL = URL + "&issue=" + issueKey;
    URL = URL + "&user=" + user;
    URL = URL + "&ansidate=" + workDateTime;
    URL = URL + "&ansienddate=" + workDate;
    URL = URL + "&time=" + worked;
    URL = URL + "&remainingEstimate=" + remaining;
    URL = URL + "&comment=" + comment;
    URL = URL + "&_TypeofWork_=" + tow;

    let config = {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)',
            'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': 'application/xml, text/xml, */*; q=0.01'
        }
    }

    return fetch(URL, config);
}

async function createTimeSheet_jira9(user, pass,
    issueKey, workDate, workDateTime, workTime, worked, remaining, comment, tow) {
    //Config
    let base_url = "https://jiradomain/jira9";
    let URL = base_url + "/rest/tempo/1.0/log-work/create-log-work";

    let data = {
        "username": user,
        "issueKey": issueKey,
        "timeSpend": worked * 60 * 60, // Second
        "startDate": moment(new Date(workDate)).format("DD/MMM/YY"),
        "endDate": moment(new Date(workDate)).format("DD/MMM/YY"),
        "typeOfWork": tow,
        "remainingTime": remaining,
        "description": comment,
        "time": " " + workTime,
        "period": false
    }

    let config = {
        headers: {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "ja,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "content-type": "application/json",
        },
        body: JSON.stringify(data),
        method: "POST",
    }

    return fetch(URL, config);
}

// 
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeView() {
    let imageUrl = "https://raw.githubusercontent.com/cuongphuong/jira_worklog/master/img/loadding.gif";

    let html = "";
    html = html + '<div style="position: fixed; bottom: 0; top: 0; right: 0; left: 0; z-index: 999; display: flex; justify-content: center; align-items: center; height: 99%; border: 3px solid green; background: #ddd; opacity: 0.5">';
    html = html + `   <img width="50%" src="${imageUrl}"/>`;
    html = html + '</div>';
    html = html + '<div style="position: fixed; bottom: 0; top: 0; right: 0; left: 0; z-index: 999; display: flex; justify-content: center; align-items: center; height: 100%;">';
    html = html + '    <p id="progress_id" style="color: red; font-size: 18em; padding:0; margin: 0; text-align: center">0/0</p>';
    html = html + '</div>';

    document.getElementById("page").innerHTML += html;
}

async function loadLoginUserFromCache() {
    let response = await new Promise((resolve, reject) => chrome.storage.local.get("login_inf", function(res) {
        resolve(res);
    }));

    let loginInf = null;
    if (response && response.hasOwnProperty("login_inf")) {
        loginInf = response.login_inf;
    }

    return loginInf;
}

async function loadWorklogFromCache() {
    let worklogData = [];
    let response = await new Promise((resolve, reject) => chrome.storage.local.get("worklog_data", function(res) {
        resolve(res);
    }));

    if (response && response.hasOwnProperty("worklog_data")) {
        worklogData = response.worklog_data;
    }

    return worklogData;
}

/* Import */
start();