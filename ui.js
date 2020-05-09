//TODO: star
//TODO: favorites
//TODO: trash

$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  const $mainNavLinks = $(".main-nav-links");
  const $navSubmit = $("#nav-submit");
  const $navMyStories = $("#nav-my-stories");
  const $navWelcome = $("#nav-welcome");
  const $userProfile = $("#user-profile");
  const $navUserProfile = $("#nav-user-profile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    const name = $("#create-account-name").val();
    const username = $("#create-account-username").val();
    const password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for submitting.
   *  If successfully we will submit a new article
   */
  $submitForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the required fields
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();

    const date = new Date().toISOString();
    const story = new Story({ author: author, title: title, url: url});
    await storyList.addStory(currentUser, story);

    $("#author").val("");
    $("#title").val("");
    $("#url").val("");

    hideElements();
    await generateStories(false);
    $submitForm.css("display", "flex");
    $allStoriesList.show();
  });

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function() {
    // empty out local storage
    //localStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */
  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */
  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories(false);
    $allStoriesList.show();
  });

  /**
   * Event handler for Submit link
   */
  $navSubmit.on("click", async function () {
    hideElements();
    await generateStories(false);
    $submitForm.css("display", "flex");
    $allStoriesList.show();
  });

  /**
   * Event handler for My Stories link
   */
  $navMyStories.on("click", async function () {
    hideElements();
    await generateStories(true);
    $ownStories.css("display", "block");
  });

  /**
   * Event listener for User Profile link
   */
  $navUserProfile.on("click", function (evt) {
    hideElements();
    $("#profile-name").text(currentUser.name);
    $("#profile-username").text(currentUser.username);
    $("#profile-account-date").text(currentUser.createdAt.split('T')[0]);
    $userProfile.show();
  });

  /**
   * Event handler for favorites star
   */
  $(document).on("click", ".star", function (evt) {
    if (currentUser) {
      evt.target.classList.toggle("fas");
      evt.target.classList.toggle("far");
      localStorage.setItem(evt.currentTarget.parentNode.id, evt.target.className);
    }
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories(false);

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  async function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    await generateStories(false);
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */
  async function generateStories(myStories) {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    $ownStories.empty();

    let noStories = true;
    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
      if (myStories && (story.username === currentUser.username)) {
        noStories = false;
        $ownStories.append(result);
      }
    }
    if (myStories && noStories) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
  function generateStoryHTML(story) {
    const hostName = getHostName(story.url);

    // render story markup
    let classList = "fa-star far";
    if (currentUser) {
      classList = localStorage.getItem(story.storyId)
      if (classList === null) {
        classList = "fa-star far";
      }
      localStorage.setItem(story.storyId, classList);
    }

    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star">
          <i class="${classList}"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $mainNavLinks.css("display", "inline");
    $("#nav-welcome").css("display", "inline");
    $navUserProfile.text(currentUser.username);
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
