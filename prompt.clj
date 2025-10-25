(ns prompt)

(defn determine-the-user-choosed-task []
  ;; The user can choose one task from the the give task list:
  ;; The function should return the task name and the task arguments
  ;; 1. s-md-visible: to make the markdown content visible, the arguments should be:
  ;;    --file: markdown file path
  ;;    --sharing-name: the name to share the markdown content
  ;;    --checking-url: the url to check visibility every 1 second
  ;;    --port: the port to run the task
  )

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

;; ;;This task will make the markdown content visible on the given port, which mean when the user access the localhost:<port>, the markdown content will be rendered and visible
  ;; ;;It will check the visibility of the markdown content on the given url every 1 second
  ;; ;;If the content is not visible, it will reload the page
  ;; ;;If the accesser to the localhost:<port> disabled the javascript, the content will not be visible
  ;; ;;The markdown content will not be posiible or hard to copy for normal user
  )

(defn access-the-stateful-sharing-md [sharing-name]
  ;; ;;This function will return the markdown content via the sharing-name
  ;; ;;It should return the markdown content if the sharing-name is valid
  ;; ;;If the sharing-name is invalid, it should return an error message
  ;; ;;The returned markdown content should be rendered on the page
  ;; ;; will check the visibility of the markdown content on the given url every 1 second
  ;; ;;If the content is not visible, will do a reload of the page
  ;; The "exists" only means the given sharing-name is valid as this is a LLM prompt in clojure style not code to run
  (when-not (= "valid-sharing-name" sharing-name)
    ;;return an error message included html content
    false)
  ;;return the the markdown content
  true)

(defn when-user-access-the-md-visible-page [sharing-name]
  ;; ;;This function will be called when the user access the md visible page
  ;; ;; If the cheking url return visible false, it will show a message to tell the user the content is not visible
  ;; ;;If the checking url return visible true, it will render the markdown content on the page
  (access-the-stateful-sharing-md sharing-name))

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

(defn main []
  ;;; This should be a typescript project
  ;;; The user of this project run this typescript project via: npm run start
  (let [[task-name, task-args] (determine-the-user-choosed-task)
        _ (setup-stateful-md-task task-name task-args)])

  (when-user-access-the-md-visible-page (get htt-url-path-arguments :sharing-name)))
