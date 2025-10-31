(defn update-readme []
  ;;The en and zh version of readme markdown should include the project icon.
  ;; The project icon under the folder "resource" named "stateful-md-icon.png"
  ;; And should mention the copyright information of the project icon in the readme file.
  ;; Also should mention about that this proejct is 90% created by AI tools and the folder that includes all the prompts used to create this project is "prompt"
  ;;And the prompt folder should be a link to the prompt folder in the github repository i guess ?
  ;;
  )

(defn add-copyrigth-of-the-project-icon []
  ;; Add the copyright information of the project icon to the license file.
  ;; The code is free to use under the license.
  ;; but the project icon is not free to use, it is belong to me which mean the author of this project.
  ;; No one should copy or use the project icon without the author's permission.
  ;;
  )

(defn main []
  ;; This is the prompt version v0.4 for stateful-md project;
  ;; The changes and new features will be placed in the changes and features list below;
  ;; The changes are the function name list that exists in previos versions, and it desciribes the changes made to these functions;
  ;; The non-code-related items are the tasks that are not related to code changes, such as updating readme file, adding copyright information, etc.
  (let [changes []
        features []
        non-code-related [add-copyrigth-of-the-project-icon update-readme]]))
