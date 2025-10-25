(ns prompt)

(defn check-s-md-visible-checking-url-argument [checking-url]
  ;; ;; All arguments should be given via command line arguments
  ;; ;;The given checking-url should be a valid url and be accessible
  ;; ;;It should return 2xx status code with json content type and contain the field "visible" with boolean value
  ;; ;;If the sharing-name is not possible to use in the url, it should throw an error
  ;;
  )

(defn run-s-md-visible-task [{:keys [file sharing-name checking-url port]}]
  (when-not (check-s-md-visible-checking-url-argument checking-url)
    ;;throw error to tell the user the checking-url is invalid and the details of the error
    false)

  ;; ;;This task will make the markdown content visible on the given port
  )

(defn access-the-not-found-page []
  ;; ;;This function will return a not found page
  ;; ;;The not found page should tell the user the requested markdown content is not found
  ;; ;;It should also provide a link to go back to the home page
  )

(defn access-the-stateful-sharing-md [sharing-name]
  ;; ;;This function will return the markdown content of the sharing-name
  ;; ;;It should return the markdown content if the sharing-name is valid
  ;; ;;The returned markdown content should be rendered on the page
  ;; ;; will check the visibility of the markdown content on the given url every 1 second
  ;; ;;If the accesser of the sharing-name targed md content disabled the javascript, the content will not be visible
  ;; ;;The markdown content will not be posiible or hard to copy for normal user
  ;; ;;If the content is not visible, will do a reload on the page

  ;; The valid-sharing-name in below only means a condition that the sharing-name exists
  (when-not (= "valid-sharing-name" sharing-name)
    ;;return an error message included html content
    (access-the-not-found-page))
  ;;return the markdown content of the given sharing-name included html content
  true)

(defn s-md-content-visible? [checking-url]
  ;; ;;This function will check the visibility of the markdown content on the given url
  ;; ;;It should return true if the content is visible
  ;; ;;It should return false if the content is not visible
  )

(defn sharing-name->checking-url [sharing-name]
  ;; ;;This function will return the checking-url for the given sharing-name
  ;; ;;The checking-url should be in the format: http://<domain>/check-md-visible/<sharing-name>
  )

(defn when-user-access-the-md-visible-page [sharing-name]
  (let [visible? (s-md-content-visible? (sharing-name->checking-url sharing-name))]
    (if visible?
      (access-the-stateful-sharing-md sharing-name)
      (access-the-not-found-page))))

(defn set-md-content-on-the-route [sharing-name]
  ;; ;;Should set up the route to access the markdown content via the sharing-name
  ;; ;;The route should be: localhost:<port>/stateful-md/<sharing-name>
  )

(defn setup-stateful-md-task [task-name task-args]
  ;; ;;This function will setup the stateful-md project environment
  ;; ;;It will install the necessary dependencies and setup the project structure
  (case task-name
    "s-md-visible" (run-s-md-visible-task task-args)
    (str "Unsupported: " task-name))
  (set-md-content-on-the-route (get task-args :sharing-name)))

(defn determine-the-user-choosed-task []
  ;; The user can choose one task from the the give task list:
  ;; The function should return the task name and the task arguments
  ;; 1. s-md-visible: to make the markdown content visible, the arguments should be:
  ;;    --file: markdown file path
  ;;    --sharing-name: the name to share the markdown content
  ;;    --checking-url: the url to check visibility every 1 second
  ;;    --port: the port to run the task
  )

(defn main []
  ;;; This should be a typescript project
  ;;; The user of this project run this typescript project via: npm run start
  (let [[task-name, task-args] (determine-the-user-choosed-task)
        _ (setup-stateful-md-task task-name task-args)])

  (when-user-access-the-md-visible-page (get htt-url-path-arguments :sharing-name)))
