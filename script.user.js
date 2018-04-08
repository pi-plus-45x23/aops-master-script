// ==UserScript==
// @name AoPS Master Script
// @description A master script for the Art of Problem Solving website
// @author pi_Plus_45x23
// @version 1.4.1
// @encoding utf-8
// @license MIT; https://opensource.org/licenses/MIT
// @icon https://assets.artofproblemsolving.com/images/apple-touch-icon.png
// @homepage https://github.com/pi-plus-45x23/aops-master-script
// @supportURL https://github.com/pi-plus-45x23/aops-master-script/issues/new
// @updateURL https://raw.githubusercontent.com/pi-plus-45x23/aops-master-script/master/script.user.js
// @downloadURL https://raw.githubusercontent.com/pi-plus-45x23/aops-master-script/master/script.user.js
// @match *://artofproblemsolving.com/*
// @exclude *://artofproblemsolving.com/*/ajax.php*
// @exclude *://artofproblemsolving.com/*/*.js*
// @exclude *://artofproblemsolving.com/schoolhouse/unabletoconnect.php*
// @exclude *://artofproblemsolving.com/m/schoolhouse/ajax-text-input.php*
// @grant unsafeWindow
// @grant window.focus
// @grant GM.addStyle
// @grant GM_addStyle
// @grant GM.getValue
// @grant GM_getValue
// @grant GM.setValue
// @grant GM_setValue
// @grant GM.getResourceText
// @grant GM_getResourceText
// @grant GM.info
// @grant GM_info
// @grant GM.notification
// @grant GM_notification
// @resource jqUiCss https://code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require https://cdn.rawgit.com/eligrey/FileSaver.js/e9d941381475b5df8b7d7691013401e171014e89/FileSaver.min.js
// @require https://pastebin.com/raw/UCN2ihRr
// @require https://rawgit.com/Frug/js-bbcode-parser/master/bbcode-parser.js
// @require https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js
// @require https://gist.githubusercontent.com/tilmanpotthof/8549286/raw/f1c0e68547e2f03af1ae84720ec524ad4e54e40c/intercept-function.js
// ==/UserScript==
/* jshint
     browser: true,
     jquery: true,
     node: true,
     esnext: false,
     esversion: 6,
     eqeqeq: true,
     indent: 2,
     latedef: true,
     newcap: true,
     quotmark: single,
     strict: true,
     undef: true,
     eqnull: true
*/
/* globals unsafeWindow, GM, saveAs, BBCodeParser, io, interceptFunction, moment, AoPS */

(() => {
  'use strict';

  // Notifications are weird in Firefox
  if (/Firefox/.test(navigator.userAgent)) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    GM.notify = (details) => {
      const notif = new Notification(
        details.title,

        {
          body: details.text,
          icon: details.image,
        },
      ); // jshint ignore: line

      setTimeout(notif.close.bind(notif), details.timeout);
      notif.onclick = details.onclick;
    };
  } else {
    GM.notify = GM.notification;
  }

  // Helper functions
  const { getValue, setValue } = (() => {
    let valueCache;

    /* jshint ignore: start */
    const getCache = async () => {
      if (typeof valueCache === 'undefined') {
        // Cache value if we haven't yet
        valueCache = await GM.getValue(String(AoPS.session.user_id), {});
      }
    };

    return {
      async getValue(name, dflt) {
        await getCache();

        if (Reflect.has(valueCache, name)) return valueCache[name];

        return dflt;
      },

      async setValue(name, value) {
        await getCache();
        valueCache[name] = value;
        await GM.setValue(String(AoPS.session.user_id), valueCache);
      },
    };
    /* jshint ignore: end */
  })();

  // Removes annoying AoPS Academy/AoPS/Beast Academy menu at top of page
  $('#header .bluebar .site-links').remove();
  $('#header .bluebar').append($('#header .sizer').clone(true));

  GM.addStyle(`
    @media (max-width: 768px) {
      #header .bluebar .sizer {
        display: none;
      }
    }

    @media (min-width: 768px) {
      #header .action-wrapper .sizer {
        display: none;
      }
    }
  `);

  // Fix search bar
  $('#search-site').on(
    'keyup',

    (e) => {
      if (e.keyCode === 13) {
        const value = $('#search-site').val().trim();

        if (value) {
          $('#form-site-search-field').val(value);
          $('#form-site-search').submit();
        }
      }
    },
  ); // jshint ignore: line

  $('#search-clicker').on(
    'click',

    () => {
      const value = $('#search-site').val().trim();

      if (value) {
        $('#form-site-search-field').val(value);
        $('#form-site-search').submit();
      }
    },
  ); // jshint ignore: line

  let UserPrivateWindow;

  if (location.pathname === '/') {
    // Front page hotkeys
    $(document).on(
      'keypress',

      (e) => {
        if ($(e.target).closest('input, select, textarea').length === 0 && !e.ctrlKey && !e.altKey) {
          switch (e.which - 96) {
            case 1:
              // A
              location.href = '/alcumus';
              break;
            case 2:
              // B
              location.href = '/store';
              break;
            case 3:
              // C
              location.href = '/community';
              break;
            case 6:
              // F
              location.href = '/ftw';
              break;
            case 13:
              // M
              location.href = '/mathcounts_trainer';
              break;
            case 16:
              // P
              location.href = '/polymath';
              break;
            case 17:
              // Q
              location.href = '/classroom';
              break;
            case 18:
              // R
              location.href = '/reaper';
              break;
            case 19:
              // S
              location.href = '/school';
              break;
            case 23:
              // W
              location.href = '/wiki/index.php?title=Main_Page';
          }
        }
      },
    ); // jshint ignore: line
  } else if (/^\/(|m\/)community/.test(location.pathname)) {
    /* globals Backbone */

    // Community vars
    const { Community } = AoPS;
    const { Constants, Utils, Views } = Community;

    // Timestamps should be always absolute
    Utils.makePrettyTime = Utils.makePrettyTimeStatic;

    // FAQ Addition
    Views.FAQ = class FAQViews extends Views.FAQ {
      render() {
        this.$el.cmtyLoadFromFile({
          filename: `${AoPS.bootstrap_data.datastore_path}cms/community/lang_en/help.html`,

          onFinish: () => {
            this.$('.cmty-help-container').append($(`
              <div class="grey-panel closed" data-key="start">
                <div class="toggle" />
                <div class="header">
                  <h3>AoPS Master Script</h3>
                </div>
                <div class="content">
                  <div class="cmty-faq-item">
                    <div class="cmty-faq-question">
                      How do I change my community homepage?
                    </div>
                    <div class="cmty-faq-answer">
                      Go to any folder (a category that holds forums and collections) and click on the <span class="aops-font">3</span> button. From there, you can set your community homepage.
                    </div>
                  </div>
                  <div class="cmty-faq-item">
                    <div class="cmty-faq-question">
                      How do I enable or disable the guestblocker?
                    </div>
                    <div class="cmty-faq-answer">
                      Go to any folder and click on the <span class="aops-font">3</span> button. If you have admin privileges, then you will be able to toggle the "Guestblocker" setting. Otherwise, you'll still be able to see the guestblock status. This type of guestblocker is NOT bypassable and will 100% block all guests from your forum/blog.
                    </div>
                  </div>
                  <div class="cmty-faq-item">
                    <div class="cmty-faq-question">
                      How do I use the hotkeys?
                    </div>
                    <div class="cmty-faq-answer">
                      This script enables certain hotkeys at the Art of Problem Solving homepage. A full list of the hotkeys are as follows:
                      <br />
                      <br />
                      <strong>A</strong>: <a href="/alcumus">Alcumus</a>
                      <br />
                      <strong>B</strong>: <a href="/store">Bookstore</a>
                      <br />
                      <strong>C</strong>: <a href="/community">Community</a>
                      <br />
                      <strong>F</strong>: <a href="/ftw">For the Win!</a>
                      <br />
                      <strong>M</strong>: <a href="/mathcounts_trainer">MATHCOUNTS Trainer</a>
                      <br />
                      <strong>P</strong>: <a href="/polymath">AoPS CrowdMath</a>
                      <br />
                      <strong>Q</strong>: <a href="/classroom">Classroom</a>
                      <br />
                      <strong>R</strong>: <a href="/reaper">Reaper</a>
                      <br />
                      <strong>S</strong>: <a href="/school">Online School</a>
                      <br />
                      <strong>W</strong>: <a href="/wiki/index.php?title=Main_Page">AoPS Wiki</a>
                    </div>
                  </div>
                </div>
              </div>
            `));

            this.$loader.detach();
            this.$('.grey-panel .header')
              .add('.grey-panel .toggle')
              .on(
                'click',

                function click() {
                  $(this).parent().toggleClass('closed');
                },
              ); // jshint ignore: line
          },
        });
      }
    };

    // General info block
    Views.CategoryAdminBlockGeneralInfo = class GenInfo extends Views.CategoryAdminBlockGeneralInfo {
      /* jshint ignore: start */
      async initialize() {
        super.initialize();

        // Event triggers
        this.events = Object.assign(
          {},

          super.events,

          {
            'change select[name="cmty-cat-admin-community-homepage-setting"]':
              'onChangeHomepageSetting',
          },
        );

        if (
          this.model.get('category_type').startsWith('folder')
          && this.model.get('category_id') !== 0
        ) {
          const defaultMasterCategory = AoPS.bootstrap_data.my_profile.base_view === 'main'
            ? Constants.master_category_id
            : Constants.portal_category_id;
          const masterCategoryId = await getValue('homepage', defaultMasterCategory);
          const homepage = this.model.get('category_id') === masterCategoryId;

          const $form = $(`
            <div class="form-group">
              <div>
                <label>
                  Community Homepage
                </label>
              </div>
              <div>
                <select name="cmty-cat-admin-community-homepage-setting">
                  <option value="1"${homepage ? ' selected' : ''}>Yes</option>
                  <option value="0"${!homepage ? ' selected' : ''}>No</option>
                </select>
              </div>
            </div>
          `);

          this.$el.find('.form').append($form);
        }
      }
      /* jshint ignore: end */

      onChangeHomepageSetting() {
        const newSetting = this.$('select[name="cmty-cat-admin-community-homepage-setting"]').val();

        if (newSetting === '1') {
          setValue('homepage', this.model.get('category_id')).then(() => location.reload());
        } else {
          setValue(
            'homepage',
            AoPS.bootstrap_data.my_profile.base_view === 'main'
              ? Constants.master_category_id // jshint ignore:line
              : Constants.portal_category_id,
          ).then(() => location.reload()); // jshint ignore:line
        }
      }
    };

    Views.CategoryAdminBlockPermissions = class PermView extends Views.CategoryAdminBlockPermissions {
      initialize() {
        super.initialize();
        this.events = Object.assign(
          {},

          super.events,

          {
            'change select[name="cmty-cat-admin-guestblock"]':
              'onChangeGuestblock',
          },
        ); // jshint ignore:line
      }

      render(...args) {
        super.render(...args);
        const guestblocker = !!this.model.attributes.users.find(user => user.role === 'deny' && user.user_id === 1);

        if (
          this.model.getPermission('c_can_lock_category')
          && this.model.get('is_public') && !this.is_new // jshint ignore:line
        ) {
          this.$el.find('.form').append($(`
            <div class="form-group">
              <div>
                <label>
                  Guestblocker
                </label>
              </div>
              <div>
                <select name="cmty-cat-admin-guestblock">
                  <option value="1"${guestblocker ? ' selected' : ''}>Yes</option>
                  <option value="0"${!guestblocker ? ' selected' : ''}>No</option>
                </select>
              </div>
            </div>
          `));
        } else if (this.model.get('is_public') && !this.is_new) {
          this.$el.find('.form').append($(`
            <div class="form-group">
              <div>
                <label>
                  Guestblocker
                </label>
              </div>
              <div>
                ${guestblocker ? 'Yes' : 'No'}
              </div>
            </div>
          `));
        }
      }

      fetchRenderData(...args) {
        const data = super.fetchRenderData(...args);

        // View ALL user boxes
        data.user_boxes = data.user_boxes.map((userBox) => {
          const newBox = Object.assign({}, userBox, { show_only_if_can_edit: false });
          return newBox;
        });

        return data;
      }

      onChangeGuestblock() {
        const newSetting = this.$('select[name="cmty-cat-admin-guestblock"]').val();

        if (newSetting === '1') {
          Utils.cmty_ajax.add({
            a: 'add_category_user',

            params: {
              category_id: this.model.get('category_id'),
              user_id: 1,
              role: 'deny',
            },

            main_handler() {},
          });
        } else {
          Utils.cmty_ajax.add({
            a: 'remove_category_user',

            params: {
              category_id: this.model.get('category_id'),
              user_id: 1,
            },

            main_handler() {},
          });
        }
      }
    };

    if (!Reflect.has(AoPS, 'Blog')) {
      Community.Router = class Router extends Community.Router {
        constructFolder(category) {
          let pageClass;

          if (category === this.models.master_category) {
            this.constructAoPSMasterCollection();
            return;
          }

          if (category === this.models.portal_category) {
            this.buildPortal();
            return;
          }

          pageClass = 'cmty-page-folder';

          /* jshint ignore: start */
          const buildPage = async () => {
            this.myPage.hideLoader();
            const isCustom = category.get('category_id') === await getValue('homepage', 0);

            if (isCustom) {
              this.startMainPage(true);
            } else {
              this.buildCoreCommunityBreadcrumbs(category);
              this.setTitle(_.unescape(category.get('category_name')));
            }

            this.myPage.showElement({
              id: `cmty-category-${category.get('category_id')}-top`,

              constructor() {
                return new (isCustom ? Views.HeadlessFolder : Views.Folder)({
                  model: category,
                });
              },
            });
          };
          /* jshint ignore: end */

          this.startNonTopicsPage({
            reset_breadcrumbs: false,
          });

          if (category.get('category_type') === 'bookmark_forums') {
            this.constructMyAopsTop();
            pageClass += ' cmty-page-my-aops cmty-page-my-bookmarks';
          }

          if (category.get('category_type') === 'bookmark_users') {
            pageClass += '  cmty-page-my-aops  cmty-page-my-bookmarks';
            this.constructMyAopsTop();
          }

          this.myPage.setClass(pageClass);
          this.setWindowResizeAction(false);
          buildPage(); // jshint ignore: line
        }

        startMainPage(custom = false) {
          this.startNonTopicsPage();
          document.title = 'AoPS Community';

          if (!custom) this.myPage.showLoader();

          Utils.cmty_ajax.cancelAll({ cancel_type: 'master' });
          this.myPage.setClass('cmty-page-folder');
          this.setWindowResizeAction(false);
          this.myPage.hideBreadcrumbs();

          this.myPage.showElement({
            id: 'cmty-main-page-top',

            constructor: () => {
              return new Views.AoPSCollectionTop({
                model: this.models.master,
              });
            },

            location: 'subheader',
          });
        }

        /* jshint ignore: start */
        async constructBaseView() {
          const defaultMasterCategory = this.models.master.get('base_view') === 'main'
          ? Constants.master_category_id
          : Constants.portal_category_id;
          const masterCategoryId = await getValue('homepage', defaultMasterCategory);

          if (masterCategoryId !== defaultMasterCategory) {
            this.parseEncodedUrl(`c${masterCategoryId}`);
          } else if (this.models.master.get('base_view') === 'main') {
            this.constructAoPSMasterCollection();
          } else {
            this.buildPortal();
          }
        }
        /* jshint ignore: end */
      };

      /**
       * I think this will fix the problems with the community homepage
       * sometimes not loading correctly
       * However, this fix causes weird glitches like some forums loading tags instead of topics
       * and topics not being selected properly in said forums.
       * ^Fixed :D
       */
      if (Backbone.History.started) {
        // Re-render page if history already started
        Backbone.history.stop();
        $('#main-column-standard').html('');
        $('#subheader').html('');

        const app = new Community.Router({
          master: AoPS.Community.MasterModel,
        });

        $('#main-column-standard').prepend(app.myPage.el);

        Backbone.history.start({
          pushState: true,
          root: 'community',
        });
      }
    }
  } else if (/^\/reaper\/reaper\.php/.test(location.pathname)) {
    const reaper = Object.keys(unsafeWindow).find(obj => unsafeWindow[obj] && Reflect.has(unsafeWindow[obj], 'reap'));

    if (typeof reaper !== 'undefined') {
      Object.keys(reaper).find((method) => {
        if (Reflect.has(reaper[method], 'io')) {
          reaper.socket = reaper[method];
          return true;
        }

        return false;
      });

      // Reaper desktop notifications
      reaper.socket.on(
        'reap',
        (name, delta) => {
          if (!document.hasFocus()) {
            GM.notify({
              text: `${name} reaped for ${reaper.prettySeconds(delta)}.`,
              title: 'reaper',
              image: 'https://assets.artofproblemsolving.com/images/apple-touch-icon.png',
              timeout: 7000,

              onclick() {
                window.focus();
              },
            });
          }
        },
      ); // jshint ignore: line
    }
  } else if (/^\/schoolhouse\//.test(location.pathname)) {
    /* globals
         dhtmlx,
         dhtmlxEvent,
         Classroom,
         socket,
         MathJax,
         emitter,
         ContextMenu,
         Message,
         User,
         App,
         ScrollPanel: true,
         InputPanel: true,
         UserlistPanel: true,
         ClassroomWindow: true,
         PrivateWindow,
         Mod,
    */

    const { Flyout, Modal, alert } = unsafeWindow;

    // Constants and functions
    const scriptObj = {
      version: GM.info.script.version,
      idle: 10 * 60 * 1000,
      join: 4 * 60 * 1000,
      limit: (700 * (3 / 5)) * 60 * 60 * 24,
      ids: {},
      jqUiCssSrc: GM.getResourceText('jqUiCss'),

      helpPage: $(`
        <div className="helpPage">
          <div>
            <h3>List of Commands Part 1</h3>
            <table style="width: 100%;">
              <tr>
                <td>/deleteall [username]</td>
                <td>
                  Deletes all messages by [username]
                  <br />
                  <b>Alias:</b> /dall
                </td>
              </tr>
              <tr>
                <td>/disconnect</td>
                <td>Disconnects from classroom</td>
              </tr>
              <tr>
                <td>/gwhisper [username] [message]</td>
                <td>
                  Sends whisper to all rooms [username] is in
                  <br />
                  <b>Alias:</b> /gw
                </td>
              </tr>
              <tr>
                <td>/join [room]</td>
                <td>Joins [room]</td>
              </tr>
              <tr>
                <td>/leave [room]</td>
                <td>Leaves [room], defaults to current room if [room] is not specified</td>
              </tr>
              <tr>
                <td>/mastersave</td>
                <td>
                  Saves transcripts for all classroom sessions
                  <br />
                  <b>Alias:</b> /ms, /msave
                </td>
              </tr>
            </table>
          </div>
          <div>
            <h3>List of Commands Part 2</h3>
            <table style="width: 100%;">
              <tr>
                <td>/mute [username]</td>
                <td>Toggles mute for [username]</td>
              </tr>
              <tr>
                <td>/muted</td>
                <td>Shows list of muted users</td>
              </tr>
              <tr>
                <td>/save</td>
                <td>Saves and downloads the transcript of the classroom</td>
              </tr>
              <tr>
                <td>/unmute</td>
                <td>Unmutes everybody</td>
              </tr>
              <tr>
                <td>/whisper [username] [message]</td>
                <td>
                  Whispers [message] to [username]
                  <br />
                  <b>Alias:</b> /w
                </td>
              </tr>
            </table>
          </div>
          <div>
            <h3>Userlist</h3>
            <img src="https://i.imgur.com/fb45W9G.png" alt="userlist" />
            <br />
            A <span style="color: #080;">green user</span> indicates a user who has joined in the last four minutes, a <span style="background-color: #ffa;">yellow background</span> indicates a user who has been inactive for at least ten minutes, and a <span style="font-style: italic; color: #aaa;">grey user</span> indicates an invisible user. All muted users show up as <span style="font-style: italic; font-family: georgia, serif;">gagged</span>. Clicking on a username will open a menu displaying a list of actions on that user.
          </div>
          <div>
            <h3>Local mutes, stickies, and deletion</h3>
            This classroom UI is extremely customizable. You can selectively mute users and sticky and delete messages at a local level. Additionally, messages deleted by a moderator will be highlighted.

            <h3>Automute</h3>
            Automute automatically mutes anybody who posts a message starting with "last."
            To enable it, go to Options and check "Automute."
            This feature is disabled by default.
          </div>
          <div>
            <h3>Notifications</h3>
            If a message is posted to the classroom and you are on a different tab, a notification will appear to alert you. To disable, go to Options and uncheck &quot;Notifications&quot;.
            <br />
            This script will also notify you if you have been mentioned (someone included @[your username] in their message)

            <h3>Quoting</h3>
            This script also adds a custom [quote] BBCode tag to the AoPS Schoolhouse. It is used in the same way as in the AoPS Message Boards. To quote someone's post in the classroom, click on the "Quote" button that comes up when you hover over their message. However, to prevent spam, it is impossible to nest more than two quotes.
          </div>
          <div>
            <h3>User whispers</h3>
            This script enables non-moderator users to send whispers and private messages to other users of this script. Initially, this took the form of a simple automatic encryption/decryption script, but was changed due a complaint from AoPSSheriff that the program was exclusionary. Thus, all whispers are sent through a 3rd party server made by me that simply relays the messages it receives. The server supports HTTPS by default, so the connection to the server itself is encrypted. However, in order to verify your identity, this script sends your session ID to the server. The server relays this to AoPS's server and does NOT log or store this information at all. Additionally, the server keeps NO message log and will not violate your privacy. You can view the source code <a href="https://github.com/pi-plus-45x23/aops-whisper-server/">here</a>.
          </div>
          <div>
            <h3>Username autocomplete</h3>
            This script adds a mention (@[username]) system to the existing username autocompletion. Upon typing the beginning of a username, a dropdown menu will appear listing all autocomplete options.

            <h3>Miscellaneous</h3>
            The classroom loads all messages in the current day via infinite scroll.
            <br />
            The part of the URL after <a href="http://artofproblemsolving.com/schoolhouse/room/">http://artofproblemsolving.com/schoolhouse/room/</a> is interpreted literally.
            For example, going to <a href="http://artofproblemsolving.com/schoolhouse/room/1155F">http://artofproblemsolving.com/schoolhouse/room/1155F</a> will take you to room 1155F.
          </div>
        </div>
      `),

      updateMutes() {
        Object.values(App.windows).forEach((win) => {
          if (win instanceof ClassroomWindow) {
            /* jshint ignore: start */
            Object.values(this.ids).forEach(async (id) => {
              const user = win.getUser(id);

              if (user) {
                const isMuted = (await getValue('muted', [])).indexOf(user.name) !== -1;

                // Only add if strictly necessary
                if (user.muted !== isMuted) win.addUser(user);
              }
            });
            /* jshint ignore: end */
          }
        });
      },

      getId(username) {
        const { ids } = this;
        return ids[Object.keys(ids).find(name => name.toLowerCase() === username.toLowerCase()) || ''] || 1;
      },

      getAvatar: (() => {
        const avatars = {};
        let promise = Promise.resolve();

        return (username, callback) => {
          if (username === '') {
            // Execute callback after Promises are finished
            promise = promise.then(callback);
            return;
          }

          promise = promise
            .then(() => {
              if (avatars[username]) {
                return avatars[username];
              }

              return $.when($.post(
                '/m/community/ajax.php',

                {
                  a: 'fetch_user_profile',
                  user_identifier: username,
                  aops_logged_in: true,
                  aops_user_id: AoPS.session.user_id,
                  aops_session_id: AoPS.session.id,
                },
              )) // jshint ignore: line
                .then((data) => {
                  avatars[username] = data.error_code
                    ? 'http://avatar.artofproblemsolving.com/no_avatar.png' // jshint ignore: line
                    : `http:${data.response.user_data.avatar}`;
                  return avatars[username];
                }); // jshint ignore: line
            })
            .then(callback);
        };
      })(),

      notification(title, username, message, roomId) {
        this.getAvatar(
          username,

          (avatar) => {
            GM.notify({
              title,
              text: Classroom.utils.htmlToBBCode(message),
              image: avatar,
              timeout: 4000,

              onclick() {
                window.focus();
                const win = App.getWindow(roomId);

                if (win) {
                  win.bringToTop();
                }
              },
            }); // jshint ignore: line
          },
        ); // jshint ignore: line
      },

      getPublicMessageActions(msg, type) {
        // Yay jQuery!
        const $wrapper = $('<div />').addClass('actions');

        const $timestamp = $('<span />').addClass('action').text(moment(msg.time).format('HH:mm:ss'));
        $wrapper.append($timestamp);

        if (!$($.parseHTML(msg.message)).hasClass('chessboard')) {
          // No quoting chessboards
          const $quote = $('<span />').addClass('action quote').attr('id', msg.room_id).text('Quote');
          $wrapper.append($quote);
        }

        if (type === 'sticky') {
          const $remove = $('<span />').addClass('action delete-sticky').text('Remove');
          $wrapper.append($remove);
        } else {
          const $delete = $('<span />').addClass('action delete').text('Delete');
          $wrapper.append($delete);

          const $sticky = $('<span />').addClass('action sticky').text('Sticky');
          $wrapper.append($sticky);
        }

        return $wrapper;
      },

      getWhisperActions(msg) {
        return $(`
          <div class="actions">
            <span class="action">${moment(msg.time).format('HH:mm:ss')}</span>
            <span class="action quote-whisper" id=${msg.room_id}>Quote</span>
            <span class="action delete-whisper">Delete</span>
          </div>
        `);
      },

      appendOptionMenuItems(items) {
        items.push({
          id: 'automute',
          text: 'Automute',
          img: Classroom.properties.automute ? App.checkmark : '',
        });

        items.push({
          id: 'notifications',
          text: 'Notifications',
          img: Classroom.properties.notifications ? App.checkmark : '',
        });
      },

      /* jshint ignore: start */
      async appendUserContextMenu(target) {
        const menu = {};
        const user = this.getUser(target);
        const win = this.getWindow(target);

        if (!user) return menu;

        /**
         * Unfortunately we have to mutate params
         * because the existing API makes us >:-(
         */
        if (!Classroom.utils.isModerator()) {
          if (
            user
            && win
            && win.whisper
            && Number(win.whisper.user_id) === user.user_id
          ) {
            menu.Unwhisper = this.unwhisper;
          } else {
            menu.Whisper = this.whisper;

            if (target.plus) {
              menu['Whisper Plus'] = this.whisperPlus;
            }
          }

          menu['Open Private Chat'] = this.privateChat;

          if (target.plus) {
            menu['Open Private Chat Plus'] = this.privateChatPlus;
          }
        }

        if ((await getValue('muted', [])).indexOf(user.name) !== -1) {
          menu.Unmute = this.unmute;
        } else if (user.name !== AoPS.session.username) {
          menu.Mute = this.mute;
        }

        return menu;
      },
      /* jshint ignore: end */

      whisper(target) {
        const user = scriptObj.getUser(target);

        if (user) {
          const win = scriptObj.getWindow(target);

          if (win) {
            win.setInputMessage(`Whispering to ${user.name} ... (ESC to abort)`);
            win.focus();
            win.whisper = user;
          }
        }
      },

      whisperPlus(target) {
        const user = scriptObj.getUser(target);

        if (user) {
          const win = scriptObj.getWindow(target);

          if (win) {
            win.setInputMessage(`Whispering to ${user.name} ... (ESC to abort)`);
            win.focus();
            win.whisper = user;
            win.whisper.plus = target.plus;
          }
        }
      },

      unwhisper(target) {
        const user = scriptObj.getUser(target);

        if (user) {
          const win = scriptObj.getWindow(target);

          if (win) {
            win.callEvent('onClearWhisper');
            win.focus();
          }
        }
      },

      privateChat(target) {
        const user = scriptObj.getUser(target);

        if (user) {
          Classroom.socketio.emit('private start', user.name, user.room_id, '');
        }
      },

      privateChatPlus(target) {
        const user = scriptObj.getUser(target);

        if (user) {
          Classroom.socketio.emit('private start', user.name, user.room_id, target.plus);
        }
      },

      mute(target) {
        const user = scriptObj.getUser(target);

        /* jshint ignore: start */
        const ok = async function onOkButton() {
          const muted = await getValue('muted', []);
          const timeouts = await getValue('timeouts', {});
          const minutes = Number($('#modal-minutes').val());

          if (Classroom.utils.isPositiveInteger(minutes)) {
            this.close();
            muted.push(user.name);
            timeouts[user.name] = new Date().getTime() + (minutes * 60 * 1000);
            await setValue('muted', muted);
            await setValue('timeouts', timeouts);
            scriptObj.updateMutes();

            setTimeout(
              async () => {
                const muted = await getValue('muted', []);
                const timeouts = await getValue('timeouts', {});

                if (muted.indexOf(user.name) !== -1) {
                  muted.splice(muted.indexOf(user.name), 1);
                }

                if (timeouts[user.name]) {
                  delete timeouts[user.name];
                }

                await setValue('muted', muted);
                await setValue('timeouts', timeouts);

                if (user) scriptObj.updateMutes();
              },

              timeouts[user.name] - new Date().getTime(),
            );
          } else if (minutes === 0) {
            this.close();
            muted.push(user.name);
            await setValue('muted', muted);
            scriptObj.updateMutes();
          } else {
            this.close();
            alert('Invalid number of minutes specified. Please use a nonnegative integer.');
          }
        };
        /* jshint ignore: end */

        if (user) {
          const html = [
            'For how many minutes should the user be muted? Leave at zero for a permanent mute.',
            '<input id="modal-minutes" style="width:98%;padding:2px 4px" placeholder="Minutes to mute" value="0">',
          ];

          const modal = new Modal({
            title: 'Mute',
            content: html.join('<br /><br />'),
            maxWidth: 300,

            onOpen() {
              const element = $('#modal-minutes')[0];
              element.focus();

              element.addEventListener(
                'keyup',

                (e) => {
                  if (e.which === 13) {
                    ok.call(modal); // jshint ignore: line
                  }
                },
              ); // jshint ignore: line
            },

            buttons: {
              OK: ok, // jshint ignore: line

              Cancel() {
                this.close();
              },
            },
          });

          modal.open();
        }
      },

      /* jshint ignore: start */
      async unmute(target) {
        const muted = await getValue('muted', []);
        const timeouts = await getValue('timeouts', {});
        const user = scriptObj.getUser(target);

        if (user) {
          muted.splice(muted.indexOf(user.name), 1);

          if (timeouts[user.name]) delete timeouts[user.name];

          await setValue('muted', muted);
          await setValue('timeouts', timeouts);
          scriptObj.updateMutes();
        }
      },
      /* jshint ignore: end */

      stickyMessage(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'public-message-container');

        if (dom && dom.message) {
          if (Classroom.utils.isModeratorOfRoom(dom.message.room_id)) return;

          App.getWindow(dom.message.room_id).addSticky(dom.message);
        }
      },

      unstickyMessage(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'public-message-container');

        if (dom && dom.message) {
          if (Classroom.utils.isModeratorOfRoom(dom.message.room_id)) return;

          App.getWindow(dom.message.room_id).removeSticky(dom.message.id);
        }
      },

      quoteMessage(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'public-message-container');

        if (dom && dom.message) {
          const { message } = dom;
          const win = App.getWindow(message.room_id);
          win.appendInput(`[quote=${message.username}]${Classroom.utils.htmlToBBCode(message.message, message.latex)}[/quote] `);

          // Fix for empty message
          win.clearInputMessage();
          win.focus();
        }
      },

      deleteMessage(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'public-message-container');

        if (dom && dom.message) {
          // We still need to locally delete even when we're a mod, since the server delete will just highlight the message
          App.getWindow(dom.message.room_id).removeMessage(dom.message.id);
        }
      },

      quoteWhisper(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'whisper-message-container');

        if (dom && dom.message) {
          const message = dom.message;
          const win = App.getWindow(message.room_id);

          // Plus casework
          const from = message.type === 'whisper-to' ? AoPS.session.username : message.username;
          const to = message.type === 'whisper-to' ? message.username : AoPS.session.username;

          if (message.plus) {
            win.appendInput(`[quote=${to}]${Classroom.utils.htmlToBBCode(message.plus, message.latex)}[/quote]`);
          }

          win.appendInput(`[quote=${from}]${Classroom.utils.htmlToBBCode(message.message, message.latex)}[/quote] `);
          win.clearInputMessage();
          win.focus();
        }
      },

      deleteWhisper(target) {
        const dom = Classroom.utils.getDomParent(target.parentNode, 'whisper-message-container');

        if (dom && dom.message) {
          dom.parentNode.removeChild(dom);
        }
      },

      // Utility functions
      getUser(target) {
        if (Classroom.utils.isElement(target) && target.user) {
          return target.user;
        }

        return null;
      },

      getWindow(target) {
        const user = this.getUser(target);

        if (user) {
          return App.getWindow(user.room_id);
        }

        return null;
      },

      onOptionsMenu(item) {
        if (/^(automute|notifications)$/.test(item)) {
          Classroom.properties[item] = !Classroom.properties[item];

          // Update menu icon
          App.menu.setItemImage(item, Classroom.properties[item] ? App.checkmark : '', '');

          // Make server call to store data
          Classroom.ajax({
            item,
            action: 'update-user-data',
            value: Classroom.properties[item],
          });
        } else if (item === 'help') {
          // Documentation!
         scriptObj.openHelpPage();
        }
      },

      openHelpPage(n = 0) {
        const modal = new Modal({
          title: 'Help',
          content: $(`
            <div>
              <div style="text-align: center;">
                <span class="prevpage aops-font" style="cursor: pointer">&lt; </span>
                <strong class="pagenum" />
                <span class="nextpage aops-font" style="cursor: pointer"> &gt;</span>
              </div>
            </div>
          `).html() + this.helpPage.children()[n].outerHTML,

          onOpen() {
            const pages = scriptObj.helpPage.children().length;
            $('div strong.pagenum').html(` Page ${n + 1} of ${pages} `);

            if (n === 0) $('span.prevpage').hide();
            else $('span.prevpage').show();

            if (n === pages - 1) $('span.nextpage').hide();
            else $('span.nextpage').show();

            $('span.prevpage').on('click', () => {
              modal.close();
              scriptObj.openHelpPage(n - 1);
            });

            $('span.nextpage').on('click', () => {
              modal.close();
              scriptObj.openHelpPage(n + 1);
            });
          },
        });

        modal.open();
      },

      // Event functions
      deleteStickies() {
        const win = App.topWindow;

        if (win instanceof ClassroomWindow) {
            win.clearStickies();
        }
      },

      onKeyDown(e) {
        if (e.shiftKey && e.keyCode === 46 && !e.ctrlKey && !Classroom.utils.isModerator()) {
          scriptObj.deleteStickies();
        }
      },

      /* jshint ignore: start */
      async onClick(e) {
        const target = e.target;

        // Display context menu for user
        if (dhtmlx.html.hasClass(target, 'user') || dhtmlx.html.hasClass(target, 'username')) {
          const user = scriptObj.getUser(target);

          if (
            user
            && Classroom.utils.isModeratorOfRoom(user.room_id)
          ) {
            // Aleady created user menu if mod
            return;
          }

          const menu = await scriptObj.appendUserContextMenu(target);
          emitter.emit('append-user-context-menu', menu, target);
          ContextMenu.display(e, menu, { horizontalOffset: 5 });
        } else if (target.className === 'action delete') {
          // Message actions
          scriptObj.deleteMessage(target);
        } else if (target.className === 'action delete-whisper') {
          scriptObj.deleteWhisper(target);
        } else if (target.className === 'action sticky') {
          scriptObj.stickyMessage(target);
        } else if (target.className === 'action delete-sticky') {
          scriptObj.unstickyMessage(target);
        } else if (target.className === 'action quote') {
          scriptObj.quoteMessage(target);
        } else if (target.className === 'action quote-whisper') {
          scriptObj.quoteWhisper(target);
        }
      },
      /* jshint ignore: end */

      init() {
        // Load jQuery UI CSS
        /* jshint ignore: start */
        (async () => {
          GM.addStyle(await this.jqUiCssSrc);
        })();
        /* jshint ignore: end */

        // Custom CSS to make things look good
        GM.addStyle(`
          .public-message-container:hover {
            background-color: rgba(211, 225, 241, 0.9) !important;
          }

          .whisper-message-container .actions {
            position: absolute;
            font-weight: bold;
            right: 5px;
            color: #a00;
            display: none;
            font-size: 85%;
            cursor: pointer;
            background-color: rgba(211, 225, 241, 0.9);
            text-indent: initial;
            z-index: 10;
          }

          .whisper-message-container .actions span.action {
            margin-left: 10px;
          }

          .whisper-message-container:hover .actions {
            display: block;
          }

          .classroom-window div.username {
            margin-right: 4px !important;
          }

          .classroom-window .public-message-container div.username {
            cursor: pointer;
          }
        `);

        // Make sure that temp mutes are canceled in when they're supposed to
        /* jshint ignore: start */
        (async () => {
          const muted = await getValue('muted', []);
          const timeouts = await getValue('timeouts', {});

          Object.keys(timeouts).forEach(async (username) => {
            const time = timeouts[username];

            if (time <= new Date().getTime()) {
              delete timeouts[username];
              setValue('timeouts', timeouts);
            } else if (muted.indexOf(username) === -1) {
              muted.push(username);
              await setValue('muted', muted);

              setTimeout(
                async () => {
                  if (muted.indexOf(username) !== -1) muted.splice(muted.indexOf(username), 1);

                  if (timeouts[username]) delete timeouts[username];

                  await setValue('muted', muted);
                  await setValue('timeouts', timeouts);
                  this.updateMutes();
                },
                time - new Date().getTime(),
              );
            }
          });
        })();
        /* jshint ignore: end */

        emitter.on('on-options-menu', this.onOptionsMenu);

        // Check for click
        dhtmlxEvent(window, 'click', this.onClick);

        // Check for hotkeys
        dhtmlxEvent(window, 'keydown', this.onKeyDown);

        // Check that all moderator object menu items are set up
        ['automute', 'notifications'].forEach((item) => {
          if (Reflect.has(Classroom.properties, item)) {
            Classroom.properties[item] = !!Classroom.properties[item];
          } else if (item === 'automute') {
            Classroom.properties[item] = false;
          } else {
            Classroom.properties[item] = true;
          }
        });

        // Set properties
        let roomId;
        const { pathname } = location;

        if (!/^\/schoolhouse\/room\//.test(pathname)) {
          roomId = pathname.substring(13);
          location.href = `${location.origin}/schoolhouse/room/${roomId}`;
        }

        roomId = pathname.substring(18);

        if (roomId !== 'mathjam') {
          Classroom.properties.room_id = roomId;
        }

        Classroom.properties.timestamps = true;

        // Repaint userlists
        if (!Classroom.utils.isModerator()) {
          setInterval(
            () => {
              Object.values(App.windows).forEach((win) => {
                if (win instanceof ClassroomWindow) win.paintUserlist();
              });
            },
            3000,
          ); // jshint ignore: line
        }

        // Init whisper server
        Classroom.socketio = io('https://piplus45x23.herokuapp.com');

        Classroom.socketio.on(
          'connect',

          () => {
            Classroom.socketio.emit(
              'login',
              AoPS.session.username,
              AoPS.session.user_id,
              AoPS.session.id,
              `ws://${Classroom.properties.host}:${Classroom.properties.port}`,
            ); // jshint ignore: line
          },
        ); // jshint ignore: line

        Classroom.socketio.on(
          'valid login',

          () => {
            Flyout.display('Logged into the whisper server');
          },
        ); // jshint ignore: line

        Classroom.socketio.on(
          'err',

          (error) => {
            Classroom.error(error);
          },
        ); // jshint ignore: line

        /* jshint ignore: start */
        Classroom.socketio.on(
          'whisper',

          async (sender, message, room, plus) => {
            if ((await getValue('muted', [])).indexOf(sender) === -1) {
              Classroom.input.encodeMessage(
                message,

                (msg) => {
                  Classroom.events.whisperEvent({
                    speaker: sender,
                    message: msg,
                    'room-id': room,
                    latex: Classroom.utils.hasMath(msg),
                    plus: plus || '',
                  });
                },
              );
            }
          },
        );

        Classroom.socketio.on(
          'gwhisper',

          async (sender, message) => {
            if ((await getValue('muted', [])).indexOf(sender) === -1) {
              Classroom.input.encodeMessage(message, (msg) => {
                Classroom.events.whisperEvent({
                  speaker: sender,
                  message: msg,
                  latex: Classroom.utils.hasMath(msg),
                });
              });
            }
          },
        );

        Classroom.socketio.on(
          'private start',

          async (target, targetId, room, plus) => {
            if ((await getValue('muted', [])).indexOf(target) !== -1) return;

            let pm = App.getWindow(`private-${targetId}`);

            if (!pm) {
              pm = new UserPrivateWindow(`private-${targetId}`, `Private with ${target}`);
            } else if (!pm.active) {
              pm.callEvent('onStart');
            }

            pm.roomId = room;
            pm.target = target;

            if (plus) {
              const msg = new Message(plus);
              msg.type = 'private';
              msg.room_id = pm.roomId;
              msg.user_id = AoPS.session.user_id;
              msg.username = AoPS.session.username;
              msg.latex = Classroom.utils.hasMath(plus);
              pm.callEvent('onMessage', [msg]);
            }

            Classroom.socketio.emit('private ack', target, room, plus);
          },
        );

        /* jshint ignore: end */
        Classroom.socketio.on(
          'private ack',

          (target, targetId, room, plus) => {
            let pm = App.getWindow(`private-${targetId}`);

            if (!pm) {
              pm = new UserPrivateWindow(`private-${targetId}`, `Private with ${target}`);
            } else if (!pm.active) {
              pm.callEvent('onStart');
            }

            pm.roomId = room;
            pm.target = target;

            if (plus) {
              const msg = new Message(plus);
              msg.type = 'private';
              msg.room_id = pm.roomId;
              msg.user_id = targetId;
              msg.username = target;
              msg.latex = Classroom.utils.hasMath(plus);
              pm.callEvent('onMessage', [msg]);
            }
          },
        ); // jshint ignore: line

        Classroom.socketio.on(
          'private end',

          (speakerId) => {
            const win = App.getWindow(`private-${speakerId}`);

            if (win) win.callEvent('onEnd');
          },
        ); // jshint ignore: line

        /* jshint ignore: start */
        Classroom.socketio.on(
          'private send',

          async (window, message, username, userId, room) => {
            if ((await getValue('muted', [])).indexOf(username) !== -1) return;

            const win = App.getWindow(`private-${window}`);

            if (win) {
              Classroom.input.encodeMessage(
                message,

                (html) => {
                  const msg = new Message(html);
                  msg.type = 'private';
                  msg.room_id = roomId;
                  msg.user_id = userId;
                  msg.username = username;
                  msg.latex = Classroom.utils.hasMath(html);
                  win.callEvent('onMessage', [msg]);

                  if (!document.hasFocus() && Classroom.properties.notifications) {
                    scriptObj.notification(`Private with ${username}`, username, message, win.id);
                  }
                },
              );
            }
          },
        );

        Classroom.socketio.on(
          'private typing',

          async (username, userId) => {
            if ((await getValue('muted', [])).indexOf(username) !== -1) return;

            Classroom.events.privateTypingEvent({
              'speaker-name': username,
              'speaker-id': userId,
            });
          },
        );
        /* jshint ignore: end */

        Classroom.last = '';
      },
    };

    interceptFunction(
      App,
      'createViewport',

      {
        after() {
          App.layout.cells('a').detachMenu();

          const items = [
            {
              id: 'information',
              text: 'Client Information',
            },

            {
              id: 'save-window-positions',
              text: 'Save Window Positions',
            },

            {
              id: 'reset-window-positions',
              text: 'Reset Window Positions',
            },

            {
              id: 'tile-windows',
              text: 'Tile windows',
            },
          ];

          if (Classroom.utils.isModerator()) Mod.appendOptionMenuItems(items);

          scriptObj.appendOptionMenuItems(items);

          App.menu = App.layout.cells('a').attachMenu({
            items: [
              {
                items,
                id: 'options',
                text: 'Options',
              },

              {
                id: 'help',
                text: 'Help',
              },
            ],
          });

          if (Classroom.getProperty('autosave-windows', false)) {
            App.menu.setItemDisabled('save-window-positions');
          }

          App.menu.attachEvent(
            'onClick',

            (e) => {
              emitter.emit('on-options-menu', e);
            },
          ); // jshint ignore: line

          App.menu.setTopText('AoPS Schoolhouse');
        },
      },
    ); // jshint ignore: line

    ScrollPanel = class NewScrollPanel extends ScrollPanel {
      isAtTop() {
        // If there's no scroll, then we are considered at bottom
        if (this.panel.scrollHeight <= this.panel.clientHeight) {
          return false;
        }

        return this.panel.scrollTop === 0;
      }
    };

    InputPanel = class NewInputPanel extends InputPanel {
      constructor() {
        super();

        // History of ALL inputs (including bot messages)
        this.allInputs = [];

        // Queue of future messages
        this.queue = [];

        this.attachEvent('input', () => {
          if (this.input.id) {
            // Clear autocomplete
            $(this.input).autocomplete('close');
          }
        });

        this.panel.getPanel = () => this;
      }
    };

    UserlistPanel = class NewUserlistPanel extends UserlistPanel {
      constructor(roomId) {
        super(roomId);
        this.dom.getPanel = () => this;
      }

      paint() {
        const timestamp = new Date().getTime();
        this.clear();
        const studentUsers = [];
        const modUsers = [];

        Object.keys(this.users).forEach((userId) => {
          if (
            ['moderator', 'assistant', 'teacher', 'instructor', 'admin']
            .indexOf(this.users[userId].type) >= 0
          ) {
            modUsers.push(this.users[userId]);
          } else {
            studentUsers.push(this.users[userId]);
          }
        });

        modUsers.sort((a, b) => {
          if (a.clean < b.clean) return -1;

          if (a.clean > b.clean) return 1;

          return 0;
        });

        studentUsers.sort((a, b) => {
          if (a.clean < b.clean) return -1;

          if (a.clean > b.clean) return 1;

          return 0;
        });

        // Construct the userlist
        modUsers.forEach((user) => {
          const $dom = $('<div />');
          $dom.addClass('user moderator');
          $dom[0].user = user;

          if (user.invisible) {
            $dom.addClass('invisible');
          }

          $dom.html(user.name);
          $(this.dom).append($dom);
        });

        studentUsers.forEach((user) => {
          const $dom = $('<div />');
          $dom.addClass('user');
          $dom[0].user = user;

          if (user.activity > 0 && user.activity < timestamp - scriptObj.idle) {
            $dom.addClass('idle');
          }

          if (user.joined > timestamp - scriptObj.join) {
            $dom.addClass('recent-join');
          }

          if (user.gagged || user.openGagged || user.muted) {
            $dom.addClass('gagged');
          }

          if (user.invisible) {
            $dom.addClass('invisible');
          }

          $dom.html(user.name);
          $(this.dom).append($dom);
        });
      }
    };

    ClassroomWindow = class NewClassroomWindow extends ClassroomWindow {
      constructor(id, title, opts) {
        super(id, title, opts);

        /** @private **/
        this.outputPane = this.window.dataObj.cells('b');
        this.inputPanel = this.window.dataObj.cells('c').getAttachedObject().getPanel();
        this.userlistPanel = this.window.dataObj.cells('d').getAttachedObject().getPanel();
        this.oldConstructMessage = this.constructMessage;
        this.oldConstructWhisper = this.constructWhisper;
        this.oldAddUser = this.addUser;
        this.oldAddSticky = this.addSticky;

        this.constructMessage = (msg, type) => {
          const $wrapper = $(this.oldConstructMessage(msg, type));

          // Remove already existing mod actions
          $wrapper.remove('.actions');
          $wrapper.prepend(scriptObj.getPublicMessageActions(msg, type));

          // Add avatar
          $wrapper.find('.message').replaceWith($(`
            <div class="message">
              <img width="15" height="15" style="margin: 2px;" src=${msg.avatar} />
              <span style="width: calc(100% - 23px); display: inline-block;">
                ${Classroom.utils.postprocessMessage(msg.message)}
              </span>
            </div>
          `));

          const user = new User(msg.user_id, msg.username);
          user.room_id = this.id;
          $wrapper.find('.username')[0].user = this.getUser(msg.user_id) || user;
          $wrapper.find('.username')[0].plus = msg.message;
          return $wrapper[0];
        };

        this.constructWhisper = (msg) => {
          const $wrapper = $(this.oldConstructWhisper(msg));
          $wrapper.prepend(scriptObj.getWhisperActions(msg));
          $wrapper[0].message = msg;
          return $wrapper[0];
        };

        /* jshint ignore: start */
        this.addUser = async (user, paint = true) => {
          this.oldAddUser(Object.assign({}, user, { muted: (await getValue('muted', [])).indexOf(user.name) !== -1 }), paint);
        };
        /* jshint ignore: end */

        this.addSticky = (msg) => {
          // Add user id if missing
          const userId = msg.user_id || scriptObj.getId(msg.username);

          scriptObj.getAvatar(
            msg.username,

            (avatar) => {
              this.oldAddSticky(Object.assign({}, msg, { avatar, user_id: userId }));
            },
          ); // jshint ignore: line
        };

        // Send input!
        this.doInput = (text, useQueue = true) => {
          if (!text.length) return;

          // Don't do any checks/formatting if a command
          if (text[0] === '/') {
            Classroom.input.parse(text, this.id);
            return;
          }

          // Can't nest more than 2 quotes
          const split = text.toLowerCase().split(/\[quote\]|\[quote=.*?\]/);

          if (split.length > 1) {
            let error = false;

            split.reduce(
              (layer, str) => {
                let newLayer = (layer + 2) - str.split(/\[\/quote\]/).length;
                newLayer = newLayer > 0 ? newLayer : 0;

                if (layer === 2 || newLayer > 2) error = true;

                return newLayer;
              },
              -1,
            ); // jshint ignore: line

            if (error) {
              this.notice('You may not nest more than two quotes.');
              return;
            }
          }

          // Custom formatting
          let msg = text;

          if (!this.mathjax) {
            // Fix for rooms without mathjax
            msg = msg
              .replace(/\[quote(|=.*?)\]/gi, '[quotenojax$1]')
              .replace(/\[\/quote\]/gi, '[/quotenojax]');
          }

          msg = Classroom.utils.customFormat(msg);

          if (!msg.startsWith(';')) {
            // Fix for >5 chars in a row
            msg = msg.replace(/([^-]){6,}/g, (a, b) => a.split(b.repeat(5)).join(b.repeat(5) + (this.mathjax ? '$ $' : '[b][/b]')));
            const usernames = this.userlistPanel.getUsernames('');

            usernames.forEach((username) => {
              msg = msg.replace(
                new RegExp(`@${username}`, 'gi'),
                `[url=https://artofproblemsolving.com/community/user/${username}]@${username}[/url]`,
              ); // jshint ignore: line
            });
          }

          if (!Classroom.utils.isModerator(this.id)) {
            let input;
            const inputs = useQueue
              ? [...this.inputPanel.allInputs, ...this.inputPanel.queue] // jshint ignore: line
              : this.inputPanel.allInputs;
            input = inputs.length >= 1 ? inputs[inputs.length - 1] : { text: '', time: 0 };

            // Add invisible LaTeX if duplicate
            while (input.text === msg || Classroom.last === msg) {
              msg += /^;/.test(msg) || this.mathjax ? '$ $' : '[b][/b]';
            }

            // Check for rate limit
            if (inputs.length >= 3) {
              input = inputs[inputs.length - 3];

              if (input.time > new Date().getTime() - 5000) {
                // Add to queue
                this.inputPanel.queue.push({
                  text: msg,
                  orig: text,
                  time: input.time + 5000,
                });

                // Send message later
                setTimeout(
                  () => {
                    this.inputPanel.queue.find((queued, index) => {
                      if (queued.time === input.time + 5000) {
                        const txt = queued.orig || '';
                        this.inputPanel.queue.splice(index, 1);
                        this.doInput(txt, false);
                        return true;
                      }

                      return false;
                    });
                  },
                  (input.time + 5000) - new Date().getTime(),
                ); // jshint ignore: line

                return;
              }
            }

            if (this.whisper) {
              Classroom.input.encodeMessage(
                msg,

                (message) => {
                  this.addWhisper({
                    message,
                    room_id: this.id,
                    username: this.whisper.name,
                    type: 'whisper-to',
                    time: new Date().getTime(),
                    latex: Classroom.utils.hasMath(message),
                  });

                  if (Classroom.utils.isModeratorOfRoom(this.id)) {
                    // "Real whisper"
                    Classroom.send({
                      message,
                      action: 'whisper',
                      'room-id': this.id,
                      target: this.whisper.name,
                      plus: this.whisper.plus || '',
                    });
                  } else {
                    // Socket.io whisper
                    Classroom.socketio.emit('whisper', this.whisper.name, msg, this.id, this.whisper.plus || '');
                  }

                  delete this.whisper;
                },
              ); // jshint ignore: line
            } else {
              Classroom.input.process(
                msg,
                this.id,

                (message, x) => {
                  Classroom.send({
                    x,
                    action: 'public-message',
                    message: /^\+\+|^--/.test(message) ? message.substring(2) : message,
                    latex: /^\+\+/.test(message) || !/^--/.test(message) && undefined,
                    'room-id': this.id,
                  });
                },
              ); // jshint ignore: line

              // Store input in buffer
              this.inputPanel.allInputs.push({
                text: msg,
                time: new Date().getTime(),
              });

              Classroom.last = msg;
            }
          }
        };

        this.loadHistory(Classroom.properties.preload);

        // Add infinite scroll function
        this.getOutputPanel().panel.addEventListener(
          'scroll',

          () => {
            if (
              this.getOutputPanel().isAtTop()
              && !this.getOutputPanel().loading // jshint ignore: line
              && this.history.length > 0 // jshint ignore: line
            ) this.loadHistory(Classroom.properties.preload);
          },
        ); // jshint ignore: line

        // Add autocomplete
        $(this.inputPanel.input).attr('id', id);

        $(`textarea[id="${id}"]`).autocomplete({
          source: (request, response) => {
            const s = request.term.substring(request.term.lastIndexOf(' ') + 1);
            this.mentionIndex = request.term.lastIndexOf(' ') + 1;

            if (s.startsWith('@') && s !== '@') {
              response(this.userlistPanel.getUsernames(s.substring(1)));
            } else {
              response([]);
            }
          },

          position: { my: 'left bottom', at: 'left top', collision: 'flip' },

          select: (event, ui) => {
            const input = this.inputPanel.getInput();
            this.inputPanel.setInput(`${input.substring(0, this.mentionIndex)}@${ui.item.value}`);
            event.stopPropagation();
            event.preventDefault();
          },

          focus: (event, ui) => {
            const input = this.inputPanel.getInput();
            this.inputPanel.setInput(`${input.substring(0, this.mentionIndex)}@${ui.item.value}`);
            event.stopPropagation();
            event.preventDefault();
          },
        });

        interceptFunction(this, 'setGag', {
          after(gagged, queue) {
            // Show/hide quote button based on gag status
            if (!gagged || (this.moderated && queue)) $(`.actions span[id="${this.id}"`).show();
            else $(`.actions span[id="${this.id}"`).hide();
          },
        });

        this.attachEvent(
          'onModerated',
          () => {
            const { gagged, queue } = this;

            // Same as @above
            if (gagged && this.moderated && queue) {
              $(`.actions span[id="${this.id}"`).show();
            } else if (gagged) {
              $(`.actions span[id="${this.id}"`).hide();
            }
          },
        ); // jshint ignore: line

        // Bind event handlers to new method
        this.detachEvent(Object.keys(this.dhxevs.data.onstickyadd)[0]);
        this.attachEvent('onStickyAdd', this.addSticky);
      }

      /**
       * First time invoked, gets entire history.
       * Otherwise, loads the next [count] messages to the top.
       */
      loadHistory(count = 100) {
        if (!Reflect.has(this, 'history')) {
          // Go get the data
          let timer = new Date().getTime();

          $.post(
            '/m/schoolhouse/ajax.php',

            {
              action: 'get-history',
              'room-id': this.id,
              limit: scriptObj.limit,
            },

            (data) => {
              let addBack;

              if (data.response !== '') {
                this.history = [];
                timer = new Date().getTime();

                data.response.forEach((row) => {
                  const msg = new Message(row);
                  this.history.push(msg);
                });

                /**
                 * We don't actually add any messages, because it's already been loaded.
                 * However, we do want to remove any preloaded messages from the queue
                 */
                if (this.history.length >= count) {
                  this.history.splice(this.history.length - count, count);
                } else {
                  this.history = [];
                }

                // Automatically adds back the loading screen
                addBack = () => {
                  MathJax.Hub.Queue([
                    this,

                    () => {
                      // Weird glitch -- not sure how to fix, so won't add the loading screen at all
                      if (typeof this.outputPane.attachObject === 'function') {
                        this.outputPane.attachObject($(`
                          <div style="font-size: 20px; padding: 10px; font-style: italic;">
                            Loading and rendering history, please wait...
                          </div>
                        `)[0]);
                      }
                    },
                  ]);

                  scriptObj.getAvatar(
                    '',

                    () => {
                      MathJax.Hub.Queue([this, this.displayRenderedBuffer, timer]);
                    },
                  ); // jshint ignore: line
                };

                if ($.active === 0) addBack();
                else $(document).ajaxStop(addBack);
              }
            },
          ) // jshint ignore: line
            .fail(() => { // jshint ignore: line
              // No chat history at all, i.e. rooms 2-9, old classrooms, etc.
              this.history = [];
              this.displayRenderedBuffer(timer);
            });
        } else {
          // Loading messages from infinite scroll
          this.addMessagesToTop(this.history.splice(this.history.length - count, count));
        }
      }

      // Removes the loading screen
      displayRenderedBuffer(timestamp) {
        if (Classroom.debug) {
          console.log(`Entire buffer rendered in ${new Date().getTime() - timestamp} ms`);
        }

        if (typeof this.outputPane.attachObject === 'function') {
          this.outputPane.attachObject(this.getOutputPanel().getElement());
        }

        // Make sure pywindows are rendered
        if (typeof pythonTool !== 'undefined') {
          const children = [...this.getOutputPanel().getElement().querySelectorAll('.pywindow')];

          if (children.length > 0) {
            children.forEach((child) => {
              Classroom.pywindow(child.parentNode);
            });
          }
        }

        this.getOutputPanel().goToBottom();
      }

      // Clears input Message
      clearInputMessage() {
        this.inputPanel.setMessage('');
      }

      addMessage(msg) {
        scriptObj.getAvatar(
          msg.username,

          (avatar) => {
            super.addMessage(Object.assign({}, msg, { avatar }));
          },
        ); // jshint ignore: line
      }

      // Adds multiple messages to the top of the panel
      addMessagesToTop(msgs) {
        const top = this.getOutputPanel().panel.childNodes[0];
        const loaded = [];

        // Add loader icon
        this.getOutputPanel().loading = true;

        const $loader = $(`
          <div style="text-align: center;">
            <img src="/assets/images/logo-ludicrous.gif" alt="" />
          </div>
        `);

        this.getOutputPanel().insertBefore($loader[0], top);

        msgs.forEach((msg) => {
          scriptObj.getAvatar(
            msg.username,

            (avatar) => {
              const message = Object.assign({}, msg, { dom: this.constructMessage(Object.assign({}, msg, { avatar })) });
              loaded.push(message);
            },
          ); // jshint ignore: line
        });

        scriptObj.getAvatar(
          '',

          () => {
            loaded.forEach((msg) => {
              this.messages[msg.id] = msg;
              this.getOutputPanel().renderContent(msg.dom, { latex: msg.latex, before: $loader[0] });
            });

            MathJax.Hub.Queue([
              () => {
                this.getOutputPanel().loading = false;

                // Remove loading icon
                this.getOutputPanel().panel.removeChild($loader[0]);
              },
            ]);
          },
        ); // jshint ignore: line
      }

      // Highlights a message
      highlightMessage(id) {
        if (Reflect.has(this.messages, id)) {
          if (this.messages[id].dom) {
            const { dom } = this.messages[id];
            dom.style.backgroundColor = '#ff9999';
          }
        }
      }
    };

    // Special private window for private chats
    UserPrivateWindow = class extends PrivateWindow {
      constructor(id, title, classroom) {
        super(id, title, classroom);

        // Detach events
        this.detachEvent(Object.keys(this.dhxevs.data.onbutton)[0]);
        this.detachEvent(Object.keys(this.dhxevs.data.login)[0]);
        this.active = true;

        const inputPane = this.window.dataObj.cells('b');
        const inputPanel = inputPane.getAttachedObject().getPanel();
        inputPanel.detachEvent(Object.keys(inputPanel.dhxevs.data.input)[1]);
        inputPanel.detachEvent(Object.keys(inputPanel.dhxevs.data.onkeyup)[0]);

        this.terminate = () => {
          inputPanel.detachAllEvents();
          this.window.detachAllEvents();
          this.detachAllEvents();
          this.window = null;
          this.active = false;

          // Leave room
          Classroom.socketio.emit('private end', this.target, this.roomId);
        };

        this.attachEvent(
          'onButton',

          (itemId) => {
            if (itemId === 'restart') {
              Classroom.socketio.emit('private start', this.target, this.roomId, '');
            }
          },
        ); // jshint ignore: line

        this.attachEvent(
          'onStart',

          () => {
            this.active = true;
          },
        ); // jshint ignore: line

        this.attachEvent(
          'onEnd',

          () => {
            this.active = false;
            this.toolbar.showItem('restart');
          },
        ); // jshint ignore: line

        this.attachEvent(
          'disconnect',

          () => {
            this.active = false;
            this.toolbar.showItem('restart');
          },
        ); // jshint ignore: line

        this.attachEvent(
          'login',

          () => {
            Classroom.socketio.emit('private start', this.target, this.roomId, '');
          },
        ); // jshint ignore: line

        inputPanel.attachEvent('input', (text) => {
          if (text === '') return;

          const msg = Classroom.utils.customFormat(text);
          Classroom.socketio.emit('private send', this.target, msg, this.roomId, Classroom.utils.hasMath(msg));
          inputPanel.clear();
        });

        let typingTimestamp = 0;

        inputPanel.attachEvent(
          'onKeyUp',

          () => {
            const timestamp = new Date().getTime();

            if (typingTimestamp < timestamp - 4000) {
              Classroom.socketio.emit('private typing', this.target);
              typingTimestamp = timestamp;
            }
          },
        ); // jshint ignore: line

        window.addEventListener(
          'unload',

          () => {
            if (this.active) {
              Classroom.socketio.emit('private end', this.target, this.roomId);
            }
          },
        ); // jshint ignore: line
      }
    };

    // Smiley to image map
    Classroom.utils.smilies1 = Object.assign(
      {},

      Classroom.utils.smilies1,

      {
        ':blush:': 'http://artofproblemsolving.com/assets/images/smilies/redface_anim.gif',
        ':maybe:': 'http://artofproblemsolving.com/assets/images/smilies/unsure.gif',
        ':-D': 'http://artofproblemsolving.com/assets/images/smilies/biggrin.gif',
        ':mad:': 'http://artofproblemsolving.com/assets/images/smilies/mad.gif',
        ':oops:': 'http://artofproblemsolving.com/assets/images/smilies/blush.gif',
        ':roll:': 'http://artofproblemsolving.com/assets/images/smilies/rolleyes.gif',
        ';)': 'http://artofproblemsolving.com/assets/images/smilies/wink.gif',
        ':!:': 'http://artofproblemsolving.com/assets/images/smilies/exclaim.gif',
        ':idea:': 'http://artofproblemsolving.com/assets/images/smilies/idea.gif',
        ':arrow:': 'http://artofproblemsolving.com/assets/images/smilies/icon2.gif',
        ':rotfl:': 'http://artofproblemsolving.com/assets/images/smilies/rotfl.gif',
        ':huh:': 'http://artofproblemsolving.com/assets/images/smilies/huh.gif',
        ':ninja:': 'http://artofproblemsolving.com/assets/images/smilies/ph34r.gif',
        ':no:': 'http://artofproblemsolving.com/assets/images/smilies/sleep.gif',
        ':love:': 'http://artofproblemsolving.com/assets/images/smilies/wub.gif',
        ':wacko:': 'http://artofproblemsolving.com/assets/images/smilies/wacko.gif',
        ':what?:': 'http://artofproblemsolving.com/assets/images/smilies/blink.gif',
        ':alien:': 'http://artofproblemsolving.com/assets/images/smilies/alien_grn.gif',
        ':cool:': 'http://artofproblemsolving.com/assets/images/smilies/cool.gif',
        ':first:': 'http://artofproblemsolving.com/assets/images/smilies/first.gif',
        ':dry:': 'http://artofproblemsolving.com/assets/images/smilies/dry.gif',
        ':laugh:': 'http://artofproblemsolving.com/assets/images/smilies/laugh.gif',
        ':coolspeak:': 'http://artofproblemsolving.com/assets/images/smilies/coolspeak.gif',
        ':oops_sign:': 'http://artofproblemsolving.com/assets/images/smilies/oops.gif',
        ':whistling:': 'http://artofproblemsolving.com/assets/images/smilies/whistling.gif',
        ':yinyang:': 'http://artofproblemsolving.com/assets/images/smilies/yinyang.gif',
        ':w00t:': 'http://artofproblemsolving.com/assets/images/smilies/w00t.gif',
        ':pilot:': 'http://artofproblemsolving.com/assets/images/smilies/plane.gif',
        ':play_ball:': 'http://artofproblemsolving.com/assets/images/smilies/play_ball.gif',
        ':police:': 'http://artofproblemsolving.com/assets/images/smilies/police.gif',
        ':read:': 'http://artofproblemsolving.com/assets/images/smilies/read.gif',
        ':showoff:': 'http://artofproblemsolving.com/assets/images/smilies/showoff.gif',
        ':sleep2:': 'http://artofproblemsolving.com/assets/images/smilies/sleep2.gif',
        ':sleeping:': 'http://artofproblemsolving.com/assets/images/smilies/sleeping.gif',
        ':spam:': 'http://artofproblemsolving.com/assets/images/smilies/spam.gif',
        ':spidy:': 'http://artofproblemsolving.com/assets/images/smilies/spidy.gif',
        ':starwars:': 'http://artofproblemsolving.com/assets/images/smilies/starwars.gif',
        ':stink:': 'http://artofproblemsolving.com/assets/images/smilies/stink.gif',
        ':strecher:': 'http://artofproblemsolving.com/assets/images/smilies/stretcher.gif',
        ':cleaning:': 'http://artofproblemsolving.com/assets/images/smilies/suck_kr.gif',
        ':surf:': 'http://artofproblemsolving.com/assets/images/smilies/surfing.gif',
        ':surrender:': 'http://artofproblemsolving.com/assets/images/smilies/surrender.gif',
        ':thumbup:': 'http://artofproblemsolving.com/assets/images/smilies/thumbup.gif',
        ':trampoline:': 'http://artofproblemsolving.com/assets/images/smilies/trampoline.gif',
        ':w00tb:': 'http://artofproblemsolving.com/assets/images/smilies/w00tbrows.gif',
        ':wallbash:': 'http://artofproblemsolving.com/assets/images/smilies/wallbash.gif',
        ':wallbash_red:': 'http://artofproblemsolving.com/assets/images/smilies/wallbash_red.gif',
        ':weightlift:': 'http://artofproblemsolving.com/assets/images/smilies/weightlift.gif',
        ':welcome:': 'http://artofproblemsolving.com/assets/images/smilies/welcome.gif',
        ':welcomeani:': 'http://artofproblemsolving.com/assets/images/smilies/welcomeani.gif',
        ':winner_first:': 'http://artofproblemsolving.com/assets/images/smilies/winner_first_h4h.gif',
        ':winner_second:': 'http://artofproblemsolving.com/assets/images/smilies/winner_second_h4h.gif',
        ':winner_third:': 'http://artofproblemsolving.com/assets/images/smilies/winner_third_h4h.gif',
        ':wow:': 'http://artofproblemsolving.com/assets/images/smilies/wow.gif',
        ':huuh:': 'http://artofproblemsolving.com/assets/images/smilies/wtf.gif',
        ':yankchain:': 'http://artofproblemsolving.com/assets/images/smilies/yankchain.gif',
        ':yup:': 'http://artofproblemsolving.com/assets/images/smilies/yes3.gif',
        ':10:': 'http://artofproblemsolving.com/assets/images/smilies/10.gif',
        ':heli:': 'http://artofproblemsolving.com/assets/images/smilies/heli.gif',
        ':agent:': 'http://artofproblemsolving.com/assets/images/smilies/agent.gif',
        ':bomb:': 'http://artofproblemsolving.com/assets/images/smilies/bomb.gif',
        ':bruce:': 'http://artofproblemsolving.com/assets/images/smilies/bruce_h4h.gif',
        ':bye:': 'http://artofproblemsolving.com/assets/images/smilies/byebye.gif',
        ':censored:': 'http://artofproblemsolving.com/assets/images/smilies/censored.gif',
        ':chief:': 'http://artofproblemsolving.com/assets/images/smilies/chieftain.gif',
        ':clap:': 'http://artofproblemsolving.com/assets/images/smilies/clap.gif',
        ':clap2:': 'http://artofproblemsolving.com/assets/images/smilies/clap2.gif',
        ':coool:': 'http://artofproblemsolving.com/assets/images/smilies/cool1.gif',
        ':ddr:': 'http://artofproblemsolving.com/assets/images/smilies/ddr.gif',
        ':diablo:': 'http://artofproblemsolving.com/assets/images/smilies/diablo.gif',
        ':evilgrin:': 'http://artofproblemsolving.com/assets/images/smilies/evilgrin.gif',
        ':ewpu:': 'http://artofproblemsolving.com/assets/images/smilies/ewpu.gif',
        ':flex:': 'http://artofproblemsolving.com/assets/images/smilies/flex.gif',
        ':fool:': 'http://artofproblemsolving.com/assets/images/smilies/fool.gif',
        ':football:': 'http://artofproblemsolving.com/assets/images/smilies/football.gif',
        ':furious:': 'http://artofproblemsolving.com/assets/images/smilies/furious.gif',
        ':gathering:': 'http://artofproblemsolving.com/assets/images/smilies/gathering.gif',
        ':gleam:': 'http://artofproblemsolving.com/assets/images/smilies/gleam.gif',
        ':harhar:': 'http://artofproblemsolving.com/assets/images/smilies/harhar.gif',
        ':help:': 'http://artofproblemsolving.com/assets/images/smilies/helpsmilie.gif',
        ':icecream:': 'http://artofproblemsolving.com/assets/images/smilies/icecream.gif',
        ':juggle:': 'http://artofproblemsolving.com/assets/images/smilies/juggle[1].gif',
        ':jump:': 'http://artofproblemsolving.com/assets/images/smilies/jump.gif',
        ':moose:': 'http://artofproblemsolving.com/assets/images/smilies/mf_moose.gif',
        ':nhl:': 'http://artofproblemsolving.com/assets/images/smilies/nhl.gif',
        ':noo:': 'http://artofproblemsolving.com/assets/images/smilies/no.gif',
        ':omighty:': 'http://artofproblemsolving.com/assets/images/smilies/notworthy.gif',
        ':o': 'https://artofproblemsolving.com/assets/images/smilies/ohmy.gif',
        ':yoda:': 'http://artofproblemsolving.com/assets/images/smilies/yoda.gif',
        ':cursing:': 'http://artofproblemsolving.com/assets/images/smilies/cursing.gif',
        ':trial1:': 'http://artofproblemsolving.com/assets/images/smilies/trial1.gif',
      },
    ); // jshint ignore: line

    // Converts [img]<smiley url>[/img] to <smiley>
    Classroom.utils.imgToSmiley = (msg) => {
      let text = msg;

      Object.keys(Classroom.utils.smilies1).forEach((smiley) => {
        const regex = 'http(|s)'
        + Classroom.utils.smilies1[smiley].substring(4).replace(/\\/g, '\\\\'); // jshint ignore: line
        text = text.replace(new RegExp(`\\[img\\]${regex}\\[\\/img\\]`, 'gi'), smiley);
      });

      return text;
    };

    /**
     * Converts HTML into (working) BBCode
     * (Finally) complete functionality!!
     */
    Classroom.utils.htmlToBBCode = (html, latex = true) => {
      const $dom = $('<body />').html(html);

      // TFW jQuery is *so* much better than native query selectors
      $dom.find('pre').html(function code(i, old) {
        const src = old
        .replace(/<br(.*?)>/gi, '\n')
        .replace(/<(?:[^>'"]*|(['"]).*?\1)*>/gmi, '');

        let lang = $(this).attr('class') || 'code';
        lang = lang === 'text' ? 'code' : lang;
        return `[${lang}]${src}[/${lang}]`;
      });

      $dom.find('div.bbcode_indent').html((i, old) => `[indent]${old}[/indent]`);

      $dom.find('div.bbcode_left').html((i, old) => `[left]${old}[/left]`);

      $dom.find('div.bbcode_center').html((i, old) => `[center]${old}[/center]`);

      $dom.find('div.bbcode_right').html((i, old) => `[right]${old}[/right]`);

      $dom.find('div.pywindow').html((i, old) => {
        const src = $(old).find('textarea').val().replace(/newlineEscape/g, '<br />');
        return `[pywindow]${src}[/pywindow]`;
      });

      $dom.find('div.latex').html((i, old) => {
        let src = $(old).attr('code');

        if (src) {
          src = src
            .replace(/^\\definecolor{aopsblue}{rgb}{0,0,0\.8}\\textcolor{aopsblue}{(.*)}$/, '$1')
            .replace(/^}(.*){$/, '$1');
          return src;
        }

        return '';
      });

      $dom.find('div.cmty-hide-content').html((i, old) => `${old}[/hide]`);

      $dom.find('td').each(function columns(i, old) {
        $dom.find('td')[i].innerHTML = ($(this).hasClass('bbcode_firstcolumn') ? '[columns]' : '[nextcol]')
          + old.innerHTML // jshint ignore: line
          + ($(this).next().length === 0 ? '[/columns]' : ''); // jshint ignore: line
      });

      $dom.find('b').html((i, old) => `[b]${old}[/b]`);

      $dom.find('i').html((i, old) => `[i]${old}[/i]`);

      $dom.find('u').html((i, old) => `[u]${old}[/u]`);

      $dom.find('strike').html((i, old) => `[s]${old}[/s]`);

      $dom.find('span[style^="color:"]').html(function color(i, old) {
        const style = $(this).attr('style');

        if (style) return `[color=${style.substring(6)}]${old}[/color]`;
        return old;
      });

      $dom.find('span[style^="font-family:"]').html(function family(i, old) {
        const style = $(this).attr('style');

        if (style) return `[color=${style.substring(12).replace(/'/g, '"')}]${old}[/color]`;

        return old;
      });

      $dom.find('span.aops-font').html((i, old) => `[aops]${old}[/aops]`);

      $dom.find('span.bbfont-double').html((i, old) => `[size=200]${old}[/size]`);

      $dom.find('span.bbfont-one-five').html((i, old) => `[size=150]${old}[/size]`);

      $dom.find('span.bbfont-regular').html((i, old) => `[size=100]${old}[/size]`);

      $dom.find('span.bbfont-three-q').html((i, old) => `[size=75]${old}[/size]`);

      $dom.find('span.bbfont-half').html((i, old) => `[size=50]${old}[/size]`);

      $dom.find('span[style="white-space:pre;"]').html((i, old) => `[aopsnowrap]${old}[/aopsnowrap]`);

      $dom.find('span.bbcode-verbatim').html((i, old) => `[verbatim]${old}[/verbatim]`);

      $dom.find('span.cmty-hide-heading.faux-link').html((i, old) => (old === 'Click to reveal hidden text' ? '[hide]' : `[hide=${old}]`));

      $dom.find('li').html((i, old) => `[*] ${old}`);

      $dom.find('ol:not([style])').html((i, old) => `[list=1]${old}[/list]`);

      $dom.find('ol[style="list-style-type:lower-alpha"]').html((i, old) => `[list=a]${old}[/list]`);

      $dom.find('ol[style="list-style-type:upper-alpha"]').html((i, old) => `[list=A]${old}[/list]`);

      $dom.find('ol[style="list-style-type:lower-roman"]').html((i, old) => `[list=i]${old}[/list]`);

      $dom.find('ol[style="list-style-type:upper-roman"]').html((i, old) => `[list=I]${old}[/list]`);

      $dom.find('ul').html((i, old) => `[list]${old}[/list]`);

      $dom.find('a.bbcode_wiki').html((i, old) => `[[${old}]]`);

      $dom.find('a:not(.bbcode_wiki)').html(function link(i, old) {
        if ($(this).attr('href') === old) {
          return /http(|s):\/\//.test(old) ? old : `[url]${old}[/url]`;
        }

        if (
          !old.startsWith('@')
          || $(this).attr('href') !== `https://artofproblemsolving.com/community/user/${old.substring(1)}` // jshint ignore: line
        ) {
          return `[url=${$(this).attr('href')}]${old}[/url]`;
        }

        return old;
      });

      $dom.find('img.asy-image').html(function asy() {
        const alt = $(this).attr('alt');

        if (alt) return alt.replace(/<br.*?>/gi, '\n');

        return '';
      });

      $dom.find('img:not(.asy-image)').html(function img() {
        const src = $(this).attr('src');

        if (src) {
          return `[img]${(/^\/\/.*/.test(src) ? 'http:' : '') + $(this).attr('src')}[/img]`;
        }

        return '';
      });

      $dom.find('iframe').html(function iframe() {
        const src = $(this).attr('src');

        if (src) return `[youtube]${src.substring(30)}[/youtube]`;

        return '';
      });

      $dom.find('hr').html('-----');
      $dom.find('br').html('\n');
      $dom.find('script').text('');
      let text = $dom.text();
      text = Classroom.utils.imgToSmiley(text);

      /**
       * Quotes. These are, without a doubt,
       * the most frustrating part of this function.
       * Especially since they're not native classroom BBCode.
       * However, conversion is possible.
       */
      /* jshint ignore: start */
      text = text
        .replace(
        new RegExp(
          `\\[columns\\]
\\$\\\\phantom{a}\\$
\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\]Quote:\\[/size\\]\\[/i\\]\\[/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),
        '[quote]$1[/quote]',
      )
        .replace(
        new RegExp(
          `\\[columns\\]
\\$\\\\phantom{a}\\$
\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\]Quote:\\[/size\\]\\[/i\\]\\[/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),
        '[quote]$1[/quote]',
      );

      text = text
        .replace(
        new RegExp(
          `\\[columns\\]
\\$\\\\phantom{a}\\$
\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\](.*?) wrote:\\[/size\\]\\[/i\\]\\[/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),
        '[quote=$1]$2[/quote]',
      )
        .replace(
        new RegExp(
          `\\[columns\\]
\\$\\\\phantom{a}\\$
\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\](.*?) wrote:\\[/size\\]\\[/i\\]\\[/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),
        '[quote=$1]$2[/quote]',
      );

      // Quotes with no mathjax
      text = text
        .replace(
        new RegExp(
          `\\[columns\\]

\\[nextcol\\]

\\[nextcol\\]

\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\]Quote:\\[/size\\]\\[/i\\]\\[\/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),

        '[quote]$1[/quote]',
      )
        .replace(
        new RegExp(
          `\\[columns\\]

\\[nextcol\\]

\\[nextcol\\]

\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\]Quote:\\[/size\\]\\[/i\\]\\[\/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),

        '[quote]$1[/quote]',
      );

      text = text
        .replace(
        new RegExp(
          `\\[columns\\]

\\[nextcol\\]

\\[nextcol\\]

\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\](.*?) wrote:\\[/size\\]\\[/i\\]\\[\/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),

        '[quote=$1]$2[/quote]',
      )
        .replace(
        new RegExp(
          `\\[columns\\]

\\[nextcol\\]

\\[nextcol\\]

\\[nextcol\\]
\\[color=#666\\]\\[i\\]\\[aops\\]z\\[/aops\\] \\[size=75\\](.*?) wrote:\\[/size\\]\\[/i\\]\\[\/color\\]
((.|\n)*?)
\\[/columns\\]`,
          'gi',
        ),

        '[quote=$1]$2[/quote]',
      );
      /* jshint ignore: end */

      // Turn dollar signs into \$ if latex is disabled
      if (!latex && !$dom.find('div.latex').length) text = text.replace(/\$/g, '\\$');

      // Turn {{dollar}} tags into \$
      text = text.replace(/\{\{dollar\}\}/g, '\\$');
      return text;
    };

    // Custom script formatting
    Classroom.utils.customFormat = (message) => {
      let msg = message;

      if (msg.startsWith(';python ')) {
        msg = `;pymarkup ${msg.substring(8)}`;
      } else if (msg.startsWith(';pywindow ')) {
        msg = `[pywindow]${msg.substring(10)}[/pywindow]`;
      } else if (
        msg.startsWith(';')
        && !/^;verbatim |\[asy\](.|\n)*\[\/asy\]|^;pymarkup |^;php |^;java /.test(msg) // jshint ignore: line
        && !Classroom.utils.isModerator() // jshint ignore: line
      ) {
        // Make LaTeX mode black if student
        msg = `;}${msg.substring(1)}{`;
      } else {
        Object.keys(Classroom.utils.smilies1).forEach((smiley) => {
          while (msg.indexOf(smiley) !== -1) {
            const ind = msg.indexOf(smiley);
            msg = `${msg.substring(0, ind)}[img=${Classroom.utils.smilies1[smiley]}]${message.substring(ind + smiley.length)}`;
          }
        });

        // Parse quote tags
        msg = BBCodeParser.process(msg);
      }

      return msg;
    };

    // Deletes all messages by a user
    Classroom.input.deleteall = (obj) => {
      if (obj.target) {
        const clean = obj.message.toLowerCase();

        Object.values(App.windows).forEach((win) => {
          if (win instanceof ClassroomWindow) {
            Object.keys(win.messages).forEach((id) => {
              if (win.messages[Number(id)].username.toLowerCase() === clean) {
                win.removeMessage(Number(id));
              }
            });
          }
        });
      } else {
        Classroom.error('*** Must provide target for deletion');
      }
    };

    Classroom.input.dall = Classroom.input.deleteall;

    Classroom.input.disconnect = () => {
      socket.disconnect();
    };

    Classroom.input.join = (obj) => {
      if (obj.split.length > 1) {
        if (Classroom.current_room_id !== obj.target) {
          Classroom.send({
            action: 'join-room',
            'room-id': obj.target,
          });
        }
      }
    };

    Classroom.input.leave = (obj, room) => {
      let { target } = obj;

      if (obj.split.length <= 1) {
        target = room;
      }

      Classroom.send({
        action: 'leave-room',
        'room-id': target,
      });
    };

    // Save all subroom transcripts
    Classroom.input.mastersave = (obj, room) => {
      const classId = parseInt(room, 10);

      ['', 'A', 'B', 'C', 'D', 'E', 'F'].forEach((prefix) => {
        Classroom.input.save(obj, classId + prefix);
      });
    };

    Classroom.input.msave = Classroom.input.mastersave;
    Classroom.input.ms = Classroom.input.mastersave;

    // Muting is very useful :)
    Classroom.input.mute = (obj) => {
      if (obj.target) {
        const clean = obj.message.toLowerCase();

        if (
          clean === AoPS.session.username.toLowerCase()
          || parseInt(clean, 10) === AoPS.session.user_id // jshint ignore: line
        ) {
          Classroom.error('*** Cannot mute yourself');
          return;
        }

        $.post(
          '/m/community/ajax.php',

          {
            a: 'fetch_user_profile',
            user_identifier: clean,
            aops_logged_in: true,
            aops_user_id: AoPS.session.user_id,
            aops_session_id: AoPS.session.id,
          },

          /* jshint ignore: start */
          (data) => {
            (async () => {
              if (!data.error_code) {
                const muted = await getValue('muted', []);
                const { username } = data.response.user_data;
                const userId = data.response.user_data.user_id;
                const index = muted.indexOf(username);

                if (index === -1) {
                  muted.push(username);
                  Flyout.display(`${username} muted`);
                  await setValue('muted', muted);
                  scriptObj.updateMutes();
                } else {
                  muted.splice(index, 1);
                  Flyout.display(`${username} unmuted`);
                  await setValue('muted', muted);
                  scriptObj.updateMutes();
                }
              } else {
                Classroom.error('*** Invalid user');
              }
            })();
          },
          /* jshint ignore: end */
        ); // jshint ignore: line
      } else {
        Classroom.error('*** Must provide target for mute');
      }
    };

    // Get list of muted users
    /* jshint ignore: start */
    Classroom.input.muted = async () => {
      const muted = await getValue('muted', []);

      if (muted.length > 0) {
        alert(`Currently muted:<br />${muted.join(', ')}`);
      } else {
        alert('Nobody muted');
      }
    };
    /* jshint ignore: end */

    // Whisper commands
    if (!Classroom.utils.isModerator()) {
      Classroom.input.whisper = (obj, room) => {
        if (obj.split.length < 2) {
          Classroom.error('Must send whisper to somebody!<br />/whisper [username] [message]');
          return;
        }

        if (obj.split.length < 3) {
          Classroom.error(`Must send a message along with whisper!<br />/whisper ${obj.target} [message]`);
          return;
        }

        const text = Classroom.utils.customFormat(obj.split[2]);

        Classroom.input.encodeMessage(
          text,

          (message) => {
            const win = App.getWindow(room);

            if (win) {
              const msg = new Message(message);
              msg.type = 'whisper-to';
              msg.username = obj.target;
              msg.room_id = room;
              msg.latex = Classroom.utils.hasMath(message);
              win.callEvent('onWhisper', [msg]);
            }
          },
        ); // jshint ignore: line

        Classroom.socketio.emit('whisper', obj.target, text, room);
      };

      Classroom.input.w = Classroom.input.whisper;

      Classroom.input.gwhisper = (obj, room) => {
        if (obj.split.length < 2) {
          Classroom.error('Must send global whisper to somebody!<br />/gwhisper [username] [message]');
          return;
        }

        if (obj.split.length < 3) {
          Classroom.error(`Must send a message along with global whisper!<br />/gwhisper ${obj.target} [message]`);
          return;
        }

        const text = Classroom.utils.customFormat(obj.split[2]);

        Classroom.input.encodeMessage(
          text,
          (message) => {
            const win = App.getWindow(room);

            if (win) {
              const msg = new Message(message);
              msg.type = 'whisper-to';
              msg.username = obj.target;
              msg.room_id = room;
              msg.latex = Classroom.utils.hasMath(message);
              win.callEvent('onWhisper', [msg]);
            }
          },
        ); // jshint ignore: line

        Classroom.socketio.emit('gwhisper', obj.target, text);
      };
      Classroom.input.gw = Classroom.input.gwhisper;
    }

    // Save transcript
    Classroom.input.save = (obj, room) => {
      Classroom.ajax(
        {
          action: 'get-history',
          'room-id': room,
          limit: scriptObj.limit,
        },

        (data) => {
          const $head = $(`
            <template>
              <script src="http://artofproblemsolving.com/assets/vendor/jquery/2.1.3/jquery.min.js?v=1486" />
              <link rel="stylesheet" type="text/css" href="http://artofproblemsolving.com/m/schoolhouse/css/classroom.css" />
              <style type="text/css">
                span.action.quote,
                span.action.delete,
                span.action.sticky {
                  display: none !important;
                }

                .public-message-container:hover {
                  background-color: rgba(211, 225, 241, 0.9) !important;
                }

                div.username {
                  margin-right: 4px !important;
                }
              </style>
              <script type="text/x-mathjax-config">
                ${$('script[type="text/x-mathjax-config;executed=true"]').text()}
              </script>
              <script src="http://artofproblemsolving.com/assets/vendor/MathJax/MathJax.js" />
              <script>function onImageLoad() {}</script>
            </template>
          `);

          const $transcript = $('<div />')
            .addClass('messages')
            .attr('style', 'width: 100%; height: 100%; position: relative; overflow: auto; box-sizing: border-box; padding: 5px; font-size: 14px;');

          if (data.response) {
            data.response.forEach((row) => {
              const msg = new Message(row);

              scriptObj.getAvatar(
                msg.username,

                (avatar) => {
                  const $dom = $(App.topWindow.constructMessage(Object.assign({}, msg, { avatar })));

                  // Fixes for local links and urls
                  $dom.find('a').each((i, link) => {
                    const href = link.getAttribute('href');

                    if (href && !href.match(/^https?:\/\//i)) {
                      $(link).attr(
                        'href',
                        (href.match(/^\//)
                         ? 'http://artofproblemsolving.com' // jshint ignore: line
                         : 'http://artofproblemsolving.com/schoolhouse/room/')
                        + href, // jshint ignore: line
                      ); // jshint ignore: line
                    } else if (href && href.match(/^\/\/:/)) {
                      $(link).attr('href', `http:${href}`);
                    }
                  });

                  $dom.find('img').each((i, img) => {
                    const src = img.getAttribute('src');

                    if (src && !src.match(/^https?:\/\/|^\/\//i)) {
                      $(img).attr(
                        'src',
                        (src.match(/^\//)
                         ? 'http://artofproblemsolving.com' // jshint ignore: line
                         : 'http://artofproblemsolving.com/schoolhouse/room/')
                        + src, // jshint ignore: line
                      ); // jshint ignore: line
                    } else if (src && src.match(/^\/\//)) {
                      $(img).attr('src', `http:${src}`);
                    }
                  });

                  $dom.html((i, html) => html.replace(/{{dollar}}/g, '\\$'));
                  $transcript.append($dom);
                },
              ); // jshint ignore: line
            });

            scriptObj.getAvatar(
              '',

              () => {
                const blob = new Blob(
                  [`
                    <html>
                      <head>
                        ${$head.html()}
                      </head>
                      <body>${$transcript[0].outerHTML}</body>
                    </html>
                  `],
                  { type: 'text/html;charset=utf-16' },
                ); // jshint ignore: line

                saveAs(blob, `${moment().format('YYYY-MM-DD')} Transcript for ${room}.html`);
              },
            ); // jshint ignore: line
          }
        });
    };

    /* jshint ignore: start */
    Classroom.input.unmute = async () => {
      const muted = [];
      const timeouts = {};
      Flyout.display('Everyone unmuted');
      await setValue('muted', muted);
      updateMutes();
      await setValue('timeouts', timeouts);
    };
    /* jshint ignore: end */

    // Intercepting events and responses
    /* jshint ignore: start */
    interceptFunction(
      Classroom.events,
      'join-room-event',

      {
        async after(payload) {
          const { username } = payload;
          const userId = payload['user-id'];
          const room = payload['room-id'];
          const win = App.getWindow(room);

          if (win) {
            if (!scriptObj.ids[username]) scriptObj.ids[username] = userId;

            if (
              Classroom.properties.notifications
              && payload.count === 1
              && (await getValue('muted', [])).indexOf(username) === -1
            ) {
              Flyout.display(`${username} has joined ${win.getTitle()}`);
            }

            emitter.emit('on-join', payload);
          }
        },
      },
    );
    /* jshint ignore: end */

    interceptFunction(
      Classroom.events,
      'leave-room-event',

      {
        before(payload) {
          const room = payload['room-id'];
          const userId = payload['user-id'];
          const count = parseInt(payload.count, 10);
          const win = App.getWindow(room);

          if (win) {
            const user = win.getUser(userId);

            if (user && Classroom.properties.notifications && count <= 0 && !user.muted) {
              Flyout.display(`${user.name} has left ${win.getTitle()}`);
            }

            emitter.emit('on-leave', payload);
          }
        },
      },
    ); // jshint ignore: line

    // Don't tell us what to delete :P
    Classroom.events['delete-message-event'] = (payload) => {
      const room = payload['room-id'];
      const messageId = payload['message-id'];
      const win = App.getWindow(room);

      if (win) {
        win.highlightMessage(messageId);
      }
    };

    Classroom.events['close-room-event'] = (payload) => {
      const room = payload['room-id'];
      const win = App.getWindow(room);

      if (win) {
        Classroom.events['alert-event']({
          title: 'Classroom closed',
          message: `The classroom ${win.getTitle()} has been closed.`,
        });
      }
    };

    Classroom.events['refresh-event'] = () => {
      Classroom.events['alert-event']({
        title: 'Refresh event',
        message: 'An admin has forced a refresh.',
      });
    };

    Classroom.events['other-login-event'] = $.noop;

    Classroom.events['clear-event'] = () => {
      Classroom.events['alert-event']({
        title: 'Clear event',
        message: 'An admin has cleared the classroom.',
      });
    };

    const { _publicMessageEvent } = Classroom.events;

    // Notification squad :o
    /* jshint ignore: start */
    Classroom.events._publicMessageEvent = async (payload) => {
      const room = payload['room-id'];
      const win = App.getWindow(room);
      const muted = await getValue('muted', []);

      if (!win) return;

      if (
        Classroom.properties.automute
        && payload.speaker !== AoPS.session.username
        && payload.message.toLowerCase().startsWith('last')
        && muted.indexOf(payload.speaker) === -1
      ) {
        // Automute
        Classroom.input.mute({
          target: payload.speaker,
          message: payload.speaker,
        });
      } else if (muted.indexOf(payload.speaker) === -1) {
        _publicMessageEvent(payload);

        if (
          Classroom.properties.notifications
          && payload.speaker !== AoPS.session.username
          && payload.message.match(RegExp(`@${AoPS.session.username}`, 'i'))
        ) {
          scriptObj.notification(`${payload.speaker} mentioned you in ${win.getTitle()}`, payload.speaker, payload.message, payload['room-id']);
        } else if (
          Classroom.properties.notifications
          && payload.speaker !== AoPS.session.username
          && !document.hasFocus()
        ) {
          scriptObj.notification(`${payload.speaker} in ${win.getTitle()}`, payload.speaker, payload.message, payload['room-id']);
        }

        // Emit payload so that bots don't have to override main _publicMessageEvent function
        emitter.emit('on-public-message', payload);
      }
    };
    /* jshint ignore: end */

    interceptFunction(
      Classroom.events,
      'whisperEvent',

      {
        after(payload) {
          if (!document.hasFocus() && Classroom.properties.notifications) {
            scriptObj.notification(`Whisper from ${payload.speaker}`, payload.speaker, payload.message, payload['room-id']);
          }
        },
      },
    ); // jshint ignore: line

    interceptFunction(
      Classroom.events,
      'privateSendEvent',

      {
        after(payload) {
          const win = App.getWindow(`private-${payload.window}`);

          if (win && !document.hasFocus() && Classroom.properties.notifications) {
            scriptObj.notification(`Private with ${payload['speaker-name']}`, payload['speaker-name'], payload.message, win.id);
          }
        },
      },
    ); // jshint ignore: line

    interceptFunction(
      Classroom.responses,
      'join-room-response',

      {
        after(payload) {
          emitter.emit('on-join-response', payload);

          // Update user id list
          payload['user-list'].forEach((user) => {
            if (!scriptObj.ids[user.username]) scriptObj.ids[user.username] = user['user-id'];
          });
        },
      },
    ); // jshint ignore: line

    interceptFunction(
      Classroom.responses,
      'leave-room-response',

      {
        after(payload) {
          emitter.emit('on-leave-response', payload);
        },
      },
    ); // jshint ignore: line

    const roomListResponse = Classroom.responses['room-list-response'];

    Classroom.responses['room-list-response'] = (parameters) => {
      let { rooms } = parameters;

      // Add subrooms
      rooms = rooms.map((room) => {
        if (room['room-name'].startsWith('MathJam')) {
          return [room];
        }

        const suffix = room['room-name'].substring(room['room-name'].indexOf('-'));
        const subrooms = ['A', 'B', 'C', 'D', 'E', 'F'];

        return [
          room,

          ...subrooms.map((subroom) => {
            const obj = {
              'room-id': room['room-id'] + subroom,
              'room-name': room['room-id'] + subroom + suffix,
            };

            return obj;
          }),
        ];
      }).reduce((arr, item) => [...arr, ...item], []);

      roomListResponse(Object.assign({}, parameters, { rooms }));
    };

    // Init stuff
    scriptObj.init();
  }
})();
