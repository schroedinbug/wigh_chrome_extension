/**
 * @param {function(string, string)} callback - Called to process the response.
 * @param {function} errorCallback - Called when the query or call fails.
 */
function getJIRAFeed(callback, errorCallback) {
    let user = document.getElementById('user').value;
    if (user == undefined) return;

    let url = 'https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+'+user+'&providers=issues';
    makeRequest(url, '').then(function(response) {
      // empty response type allows the request.responseXML property to be
      // returned in the makeRequest call
      callback(url, response);
    }, errorCallback);
}
/**
 * @param {string} searchTerm - Search term for JIRA Query.
 * @param {function(string)} callback - Called when the query results have been
 *   formatted for rendering.
 * @param {function(string)} errorCallback - Called when the query or call
 *   fails.
 */
async function getQueryResults(searchTerm, callback, errorCallback) {
    try {
      let response = await makeRequest(searchTerm, 'json');
      callback(createHTMLElementResult(response));
    } catch (error) {
      errorCallback(error);
    }
}

function makeRequest(url, responseType) {
  return new Promise(function(resolve, reject) {
    let req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = responseType;

    req.onload = function() {
      let response = responseType ? req.response : req.responseXML;
      if (response && response.errorMessages && response.errorMessages.length > 0) {
        reject(response.errorMessages[0]);
        return;
      }
      resolve(response);
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error('Network Error'));
    };
    req.onreadystatechange = function() {
      if (req.readyState == 4 && req.status == 401) {
          reject('You must be logged in to JIRA to see this project.');
      }
    };

    // Make the request
    req.send();
  });
}


function loadOptions() {
  chrome.storage.sync.get({
    project: 'Sunshine',
    user: 'nyx.linden',
    daysPast: 0,
  }, function(items) {
    document.getElementById('project').value = items.project;
    document.getElementById('user').value = items.user;
    document.getElementById('daysPast').value = items.daysPast;
  });
}

/**
 * Build JIRA query to find tickets for a project.
 * @param {function(string)} callback - Called to process query string. Query
 *   string is passed to the callback.
 */
function buildJQL(callback) {
  let callbackBase = 'https://jira.secondlife.com/rest/api/2/search?jql=';
  let project = document.getElementById('project').value;
  let status = document.getElementById('statusSelect').value;
  let inStatusFor = document.getElementById('daysPast').value;
  let fullCallbackUrl = callbackBase;
  fullCallbackUrl += `project=${project}+and+status=${status}+and+status+changed+to+${status}+before+-${inStatusFor}d&fields=id,status,key,assignee,summary&maxresults=100`;
  callback(fullCallbackUrl);
}

/**
 * Process a JSON result and generate HTML to display the results.
 * @param {string} response - A JSON response from a JIRA query.
 */
function createHTMLElementResult(response) {
//
// Create HTML output to display the search results.
// results.json in the "json_results" folder contains a sample of the API response
// hint: you may run the application as well if you fix the bug.
//
  if (!response) {
    return '<p>There was a problem with the query response.</p>';
  }

  let issues = response.issues;

  if (!Array.isArray(response.issues)) {
    return '<p>There are no results.</p>';
  }

  let result = `There are ${issues.length} issues. <ul>`;

  for (let i = 0; i < issues.length; i++) {
    let issue = issues[i];

    // Ticket fields.
    let ticketID = issue.key;
    let ticketURL = `https://jira.secondlife.com/browse/${ticketID}`;
    let summary = issue.fields.summary || "";
    let ticketString = `${ticketID} - ${summary}`;

    result += `<li><a href=${ticketURL}>${ticketString}</a>`;

    // Assignee fields.
    let assignee = issue.fields.assignee;
    if (assignee) {
      let profileURL = `https://jira.secondlife.com/secure/ViewProfile.jspa?name=${assignee.name}`;
      result += ` assigned to <a href=${profileURL}>${assignee.displayName}</a>`;
    }

    result += '</li>';
  }

  result += '</ul>';
  return result;
}

// utility
function domify(str) {
  let dom = (new DOMParser()).parseFromString('<!doctype html><body>' + str, 'text/html');
  return dom.body.textContent;
}

async function checkProjectExists() {
    try {
      return await makeRequest('https://jira.secondlife.com/rest/api/2/project/SUN', 'json');
    } catch (errorMessage) {
      document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
      document.getElementById('status').hidden = false;
    }
}

// Setup
document.addEventListener('DOMContentLoaded', function() {
  // if logged in, setup listeners
    checkProjectExists().then(function() {
      // load saved options
      loadOptions();

      // query click handler
      document.getElementById('query').onclick = function() {
        // build query
        buildJQL(function(url) {
          document.getElementById('status').innerHTML = 'Performing JIRA search for ' + url;
          document.getElementById('status').hidden = false;
          // perform the search
          getQueryResults(url, function(returnVal) {
            // render the results
            document.getElementById('status').innerHTML = 'Query term: ' + url + '\n';
            document.getElementById('status').hidden = false;

            let jsonResultDiv = document.getElementById('query-result');
            jsonResultDiv.innerHTML = returnVal;
            jsonResultDiv.hidden = false;
          }, function(errorMessage) {
              document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
              document.getElementById('status').hidden = false;
          });
        });
      };

      // activity feed click handler
      document.getElementById('feed').onclick = function() {
        // get the xml feed
        getJIRAFeed(function(url, xmlDoc) {
          document.getElementById('status').innerHTML = 'Activity query: ' + url + '\n';
          document.getElementById('status').hidden = false;

          // render result
          let feed = xmlDoc.getElementsByTagName('feed');
          let entries = feed[0].getElementsByTagName('entry');
          let list = document.createElement('ul');

          for (let index = 0; index < entries.length; index++) {
            let html = entries[index].getElementsByTagName('title')[0].innerHTML;
            let updated = entries[index].getElementsByTagName('updated')[0].innerHTML;
            let item = document.createElement('li');
            item.innerHTML = new Date(updated).toLocaleString() + ' - ' + domify(html);
            list.appendChild(item);
          }

          let feedResultDiv = document.getElementById('query-result');
          if (list.childNodes.length > 0) {
            feedResultDiv.innerHTML = list.outerHTML;
          } else {
            document.getElementById('status').innerHTML = 'There are no activity results.';
            document.getElementById('status').hidden = false;
          }

          feedResultDiv.hidden = false;
        }, function(errorMessage) {
          document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
          document.getElementById('status').hidden = false;
        });
      };
    }).catch(function(errorMessage) {
        document.getElementById('status').innerHTML = 'ERROR. ' + errorMessage;
        document.getElementById('status').hidden = false;
    });
});
