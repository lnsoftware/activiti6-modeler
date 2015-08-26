/*
 * Activiti app component part of the Activiti project
 * Copyright 2005-2015 Alfresco Software, Ltd. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */
angular.module('activitiApp')
    .controller('RenderFormController', ['$rootScope', '$scope', '$http', '$translate', '$modal', 'appResourceRoot', 'FormService', 'RelatedContentService', '$sce', '$timeout', 'TaskService', 'hotkeys', 'uiGridConstants',
        function ($rootScope, $scope, $http, $translate, $modal, appResourceRoot, FormService, RelatedContentService, $sce, $timeout, TaskService, hotkeys, uiGridConstants) {

            // when you bind it to the controller's scope, it will automatically unbind
            // the hotkey when the scope is destroyed (due to ng-if or something that changes the DOM)
            hotkeys.bindTo($scope)
                .add({
                    combo: 'tab',
                    description: 'forward tab navigation',
                    allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
                    callback: function (event) {
                        var currentFormElement = $scope.detectCurrentFormElement(event.target);
                        var nextElement = $scope.getNextTabFormElement(currentFormElement);
                        focusFormElement(nextElement, event);
                    }
                }).add({
                    combo: 'shift+tab',
                    description: 'Backward tab navigation',
                    allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
                    callback: function (event) {
                        var currentFormElement = $scope.detectCurrentFormElement(event.target);
                        var prevElement = $scope.getPrevTabFormElement(currentFormElement);
                        focusFormElement(prevElement, event);
                    }
                });

            function focusFormElement(formElement, event) {
                if (formElement && formElement != null) {
                    if (formElement.type == "radio-buttons") {
                        formElement = angular.element("#activiti-" + formElement.id + ">div>label>input:nth-child(1)");
                    }  else {
                        formElement = angular.element("#activiti-" + formElement.id);
                    }
                    if (formElement[0]) {
                        if (typeOf('HTMLLIElement', formElement[0]))            {
                            event.preventDefault();
                        } else {
                            formElement[0].focus();
                            event.preventDefault();
                        }
                    }
                }
            }

            function typeOf(name, obj) {
                return Object.prototype.toString.call(obj) === '[object ' + name + ']';
            }

            function initModel () {
                $scope.model = {
                    loading: false,
                    valid: false,
                    uploads: {},
                    completeButtonDisabled: false,
                    saveButtonDisabled: false,
                    uploadInProgress: false,
                    restValues: {},
                    isTaskForm: false
                };
            }

            initModel();


            $scope.detectCurrentFormElement = function (currentHtmlElement) {
                var currentHtmlElementId = currentHtmlElement.id;
                if (typeOf('HTMLInputElement', currentHtmlElement) && currentHtmlElement.type == "radio") {
                    //the current input is a radio option
                    //then the parent id #activiti-<name>
                    currentHtmlElementId = "activiti-" + currentHtmlElement.name;
                }

                var fields = $scope.allFormFields;

                //calculate the index of the current element in the fields array.
                var indexInSorted = 0;
                var elementToBeSelected = null;
                for (indexInSorted = 0; indexInSorted < fields.length && elementToBeSelected==null; indexInSorted++) {
                    if (elementToBeSelected == null && "activiti-" + fields[indexInSorted].id == currentHtmlElementId) {
                        //find the element in the form elements for the next element to be selected
                        elementToBeSelected = fields[indexInSorted];
                    }
                }
                return elementToBeSelected;
            };

            $scope.getNextTabFormElement = function (currentElement) {
                var elementToBeSelected = null;
                if (currentElement && currentElement != null) {
                    var fields = $scope.allFormFields;

                    var sortedElements = filterAndSortElements(fields);

                    //calculate the index of the next element in the sorted array.
                    var indexInSorted = 0;
                    var foundElementIndex = -1;
                    for (indexInSorted = 0; indexInSorted < sortedElements.length && foundElementIndex == -1; indexInSorted++) {
                        if (sortedElements[indexInSorted].id == currentElement.id) {
                            foundElementIndex = indexInSorted;
                        }
                    }

                    if (foundElementIndex >= 0 && foundElementIndex < sortedElements.length) {
                        while (foundElementIndex < sortedElements.length-1 && elementToBeSelected == null) {
                            //find the element in the form elements for the next element to be selected
                            elementToBeSelected = sortedElements[++foundElementIndex];
                        }
                    }
                }
                return elementToBeSelected;
            };

            $scope.getPrevTabFormElement = function (currentElement) {
                var elementToBeSelected = null;
                if (currentElement && currentElement != null) {

                    var fields = $scope.allFormFields;
                    var sortedElements = filterAndSortElements(fields);

                    //calculate the index of the next element in the sorted array.
                    var indexInSorted = 0;
                    var foundElementIndex = -1;
                    for (indexInSorted = 0; indexInSorted < sortedElements.length && foundElementIndex == -1; indexInSorted++) {
                         if (sortedElements[indexInSorted].id == currentElement.id) {
                            foundElementIndex = indexInSorted;
                        }
                    }

                    if (foundElementIndex > 0) {
                        while (foundElementIndex > 0 && elementToBeSelected == null) {
                            //find the element in the form elements for the prev element to be selected
                            elementToBeSelected = sortedElements[--foundElementIndex];
                        }
                    }
                }
                return elementToBeSelected;
            };

            function filterAndSortElements(fields) {
                var sortedElements = [];
                for (var i = 0; i < fields.length; i++) {
                    sortedElements.push(fields[i]);
                }

                sortedElements = sortedElements.filter(function (field) {
                    return !(
                       field.isVisible == false
                        || field.type === 'people'
                        || field.type === 'functional-group'
                        || field.type === 'readonly-text'
                        || field.type === 'upload'
                        || field.type === 'readonly');
                });

                sortedElements = sortedElements.sort(function (field1, field2) {
                    var htmlElement1 = angular.element("#activiti-" + field1.id);
                    var htmlElement2 = angular.element("#activiti-" + field2.id);
                    var xPosition1 = 999999;
                    var yPosition1 = 999999;

                    var xPosition2 = 999999;
                    var yPosition2 = 999999;

                    if (htmlElement1) {
                        var testedElementRect1 = htmlElement1[0].getBoundingClientRect();
                        xPosition1 = testedElementRect1.left;
                        yPosition1 = testedElementRect1.top;
                    }

                    if (htmlElement2) {
                        var testedElementRect2 = htmlElement2[0].getBoundingClientRect();
                        xPosition2 = testedElementRect2.left;
                        yPosition2 = testedElementRect2.top;
                    }

                    if (yPosition1 == yPosition2) {
                        if (xPosition1 == xPosition2) return 0;
                        return (xPosition1 - xPosition2) / Math.abs(xPosition1 - xPosition2);
                    }

                    return (yPosition1 - yPosition2) / Math.abs(yPosition1 - yPosition2);

                });

                return sortedElements;
            }

            $scope.isEmpty = function (field) {
                return (field.value === undefined || field.value == null || field.value.length == 0);
            };

            $scope.isEmptyDropdown = function(field) {

                // Manual
                if (field.hasEmptyValue !== null && field.hasEmptyValue !== undefined && field.hasEmptyValue === true) {
                    if (field.options !== null && field.options !== undefined && field.options.length > 0) {
                        var emptyValue = field.options[0];
                        if (emptyValue === field.value) {
                            return true;
                        }
                    }
                } else if (field.value === '') {
                    return true
                }
                return false;
            };

            $scope.appResourceRoot = appResourceRoot;

            $scope.model.outcomesOnly = $scope.outcomesOnly !== null && $scope.outcomesOnly !== undefined
                && ($scope.outcomesOnly === true || $scope.outcomesOnly === 'true');

            // needed for selecting today in date popover

            $scope.clearDate = function(field, callback) {
                field.value = '';
                if (callback) {
                    callback(field.value);
                }
                jQuery("#" + $rootScope.activitiFieldIdPrefix + field.id).blur();
            };

            $scope.selectToday = function(field, callback) {
                var today = new Date();
                today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                field.value = today;
                if (callback) {
                    callback(field.value);
                }
                jQuery("#" + $rootScope.activitiFieldIdPrefix + field.id).blur();
            };

            $scope.closeDatePopup = function (field) {
                jQuery("#" + $rootScope.activitiFieldIdPrefix + field.id).blur();
            };

            $scope.combineFormVariables = function (processInstanceVariables) {

                var fields = $scope.allFormFields;
                var localVariables = [];

                for (var fieldArrayIndex = 0; fieldArrayIndex < fields.length; fieldArrayIndex++) {
                    // Only adding value fields for form elements currently supported in condition evaluation
                    if (fields[fieldArrayIndex].type !== 'readonly-text') {
                        localVariables.push(fields[fieldArrayIndex]);
                    }
                }

                if (processInstanceVariables && processInstanceVariables.length > 0) {
                    $scope.currentAndHistoricFormFields = processInstanceVariables.concat(localVariables);
                } else {
                    $scope.currentAndHistoricFormFields = localVariables;
                }
            };

            /**
             * Helper method: find a form field with a given id in a collection of fields
             */
            $scope.findFormFieldWithId = function (fields, id) {
                if (fields && fields.length > 0) {

                    // First check the current form fields
                    for (var i = 0; i < fields.length; i++) {
                        if (fields[i].id === id && fields[i].hasOwnProperty('isVisible')) {
                            return fields[i];
                        }
                    }

                    // Then check the historical ones
                    for (var i = 0; i < fields.length; i++) {
                        if (fields[i].id === id) {
                            return fields[i];
                        }
                    }

                }
                return undefined;
            };

            // Pre-process any previous values, if needed
            $scope.preProcessFields = function (fields) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];

                    // set visibility bool if no condition is present
                    if (!field.visibilityCondition) {
                        field.isVisible = true;
                    }
                    
                    if (((field.type == 'dropdown' || field.type == 'radio-buttons') && field.optionType == 'rest' && (field.restUrl || field.endpoint))) {
                        $scope.invokeRestUrl(field);

                    } else if (field.type == 'dropdown' && field.optionType != 'rest' && field.value && field.options) {
                        for (var j = 0; j < field.options.length; j++) {
                            if (field.options[j].name == field.value) {
                                field.value = field.options[j];
                                break;
                            }
                        }

                    } else if (field.type == 'upload' && field.value) {
                        $scope.model.uploads[field.id] = [];
                        var newUploadValue = '';
                        for (var j = 0; j < field.value.length; j++) {
                            $scope.model.uploads[field.id].push(field.value[j]);
                            if (newUploadValue.length > 0) {
                                newUploadValue += ',';
                            }
                            newUploadValue += field.value[j].id;
                        }
                        field.value = newUploadValue;


                    } else if (field.type == 'readonly' && field.params && field.params.field) {
                        if (field.params.field.type == 'upload') {
                            // Pass related content through service to add all URL's
                            if (field.value && field.value.length > 0) {
                                for (var j = 0; j < field.value.length; j++) {
                                    RelatedContentService.addUrlToContent(field.value[j]);
                                }
                            }

                        } else if (field.params.field.type == 'date') {
                            var rawValue = field.value;
                            if (rawValue) {
                                field.value = new moment(rawValue).format('LL');
                            }
                        }

                    } else if (field.type == 'readonly-text' && field.params && field.params.placeholders) {
                        // Replace the value using the placeholder values
                        for (var j = 0; j < field.params.placeholders.length; j++) {
                            var placeHolder = field.params.placeholders[j];
                            if (placeHolder.type == 'date') {
                                field.value = field.value.replace(placeHolder.placeholder, new moment(placeHolder.value).format('MMMM Do YYYY'));
                            } else if (placeHolder.type == 'upload') {
                                // For each item of content, create a link and
                                var links = '';
                                for (var k = 0; k < placeHolder.value.length; k++) {
                                    var content = placeHolder.value[k];
                                    RelatedContentService.addUrlToContent(content);
                                    RelatedContentService.checkRenditions(content);
                                    if (k != 0) {
                                        links += ', ';
                                    }
                                    links = links + '<a id="content-' + content.id + '">' + content.name + '</a>';

                                }
                                if (field.value) {
                                    field.value = field.value.replace(placeHolder.placeholder, links);
                                }
                            }
                        }

                        if (field.value) {
                            field.value = $sce.trustAsHtml(field.value);
                        }

                    }
                    else if (field.type == "readonly-text") {
                        field.value = field.value.replace(/\n/g, '<br/>')
                    }
                }
            };

            /**
             * Helper method: prepares the form fields for usage in the form template
             */
            var prepareFormFields = function (formData) {

                $scope.allFormFields = formData.fields;

                $scope.model.restValues = {};

                // populate only REST values in case of outcomesOnly
                if (!$scope.outcomesOnly) {
                    $scope.preProcessFields($scope.allFormFields);
                }
            };

            $scope.validateField = function () {

                function arrayContains(selectOptions, key, value) {
                    var found = false;
                    selectOptions.every(function (element, index, array) {
                        if (element[key] == value) {
                            found = true;
                            return false;
                        }
                        return true;
                    });
                    return found;
                }
                
                function findMatchingItem(items, key, value) {
                    var foundItem = undefined;
                    if (items && items.length > 0) {
                        items.every(function (item, index, array) {
                            if (item[key] == value) {
                                foundItem = item;
                                return false;
                            }
                            return true;
                        });
                    }
                    return foundItem;
                }

                if ($scope.allFormFields) {
                    var formValid = true;
                    for (var fieldIndex = 0; fieldIndex < $scope.allFormFields.length; fieldIndex++) {
                        var field = $scope.allFormFields[fieldIndex];

                        if (field) {
                            // Required field check
                            if (field && field.required) {
                                switch (field.type) {

                                    case 'boolean':
                                        if ((field.value === undefined || field.value == false || field.value == null)) {
                                            formValid = false;
                                        }
                                        break;

                                    case 'radio-buttons':
                                        var selectOptions = [];
                                        if (field.optionType === 'rest') {
                                            selectOptions = $scope.model.restValues[field.id];
                                        } else {
                                            selectOptions = field.options;
                                        }

                                        if (field.value === undefined || field.value == '' || field.value == null) {
                                            formValid = false;
                                        } else {
                                            formValid = arrayContains(selectOptions, "name", field.value);
                                            if (!formValid) {
                                                field.value = undefined;
                                            }
                                        }
                                        break;

                                    case 'dropdown':

                                        // hasEmptyValue was added in 1.2 for dropdowns. If true, the first value of the options array is the 'empty' value

                                        var emptyValue;
                                        if (field.hasEmptyValue !== null && field.hasEmptyValue !== undefined && field.hasEmptyValue === true) {
                                            if (field.options !== null && field.options !== null && field.options.length > 0) {
                                                emptyValue = field.options[0];
                                            }
                                        }

                                        if (emptyValue !== undefined && emptyValue !== null) {
                                            if (field.value.name === emptyValue.name) {
                                                formValid = false;
                                            }
                                        }

                                        break;

                                    default: //any other type
                                        if (field.value === undefined || field.value === '' || field.value === null) {
                                            formValid = false;
                                        }
                                        break;
                                }

                                if (!formValid) {
                                    break;
                                }
                            } else {

                            }
                        }
                    }

                    $scope.model.valid = formValid;
                }
            };


            // Deep watch form data fields to call validation
            $scope.$watch('formData', function () {
                $scope.validateField();
            }, true);

            /*
             * Fetching the task form if task id was provided, a start form if process definition id was
             * provided and otherwise the model should be on the scope
             */

            var fetchAndRenderForm = function () {

                $scope.model.loading = true;

                if ($scope.formDefinition) {

                    $scope.formData = $scope.formDefinition;
                    prepareFormFields($scope.formData);

                    if ($scope.model.outcomesOnly !== true) {

                        if ($scope.taskId) {
                            TaskService.getProcessInstanceVariables($scope.taskId).then(function (instanceVariables) {
                                $scope.combineFormVariables(instanceVariables);
                                $scope.model.loading = false;
                            });

                        } else {
                            $scope.combineFormVariables(undefined);
                            $scope.model.loading = false;
                        }
                    }

                    $scope.model.loading = false;

                } else if ($scope.taskId) {

                    FormService.getTaskForm($scope.taskId).then(function (formData) {

                        $scope.formData = formData;
                        prepareFormFields($scope.formData); // Prepare the form fields to allow for layouting

                        if ($scope.model.outcomesOnly !== true) {

                            $scope.model.loading = false;

                            TaskService.getProcessInstanceVariables($scope.taskId).then(function (instanceVariables) {
                                $scope.combineFormVariables(instanceVariables);

                                $scope.model.loading = false;
                            });

                        }

                        $scope.model.loading = false;

                    });

                } else if ($scope.processDefinitionId) {

                    FormService.getStartForm($scope.processDefinitionId).then(function (formData) {
                        $scope.formData = formData;
                        prepareFormFields($scope.formData);// Prepare the form fields to allow for layouting
                        $scope.model.loading = false;

                        $scope.combineFormVariables(undefined);
                    });
                }
            };

            // Fetch and show on first usage
            fetchAndRenderForm();

            // Re-render when process definition changes
            $scope.$watch('processDefinitionId', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    // Check if actually changed
                    initModel();
                    fetchAndRenderForm();
                }
            }, true);

            /**
             * Generates a default button text based on what is passed as config
             */
            $scope.getDefaultCompleteButtonText = function () {
                if ($scope.processDefinitionId) {
                    return $translate.instant('FORM.DEFAULT-OUTCOME.START-PROCESS');
                } else {
                    return $translate.instant('FORM.DEFAULT-OUTCOME.COMPLETE');
                }
            };

            $scope.completeForm = function (outcome) {

                $scope.model.loading = true;
                $scope.model.completeButtonDisabled = true;
                
                // Prep data
                var postData = $scope.createPostData();
                if (outcome) {
                    postData.outcome = outcome.name;
                }

                if ($scope.processDefinitionId) {

                    // Add right process-definition for this form
                    postData.processDefinitionId = $scope.processDefinitionId;

                    if ($scope.processName) {
                        postData.name = $scope.processName;
                    }
                    FormService.completeStartForm(postData).then(
                        function (data) {
                            $scope.$emit('process-started', data);
                            $scope.model.completeButtonDisabled = false;
                            $scope.model.loading = false;
                        },
                        function (errorResponse) {
                            $scope.model.completeButtonDisabled = false;
                            $scope.model.loading = false;
                            $scope.$emit('process-started-error', {processDefinitionId: $scope.processDefinitionId, error: errorResponse});
                        });


                } else {

                    FormService.completeTaskForm($scope.taskId, postData).then(
                        function (data) {
                            $scope.$emit('task-completed', {taskId: $scope.taskId});
                            $scope.model.completeButtonDisabled = false;
                            $scope.model.loading = false;
                        },
                        function (errorResponse) {
                            $scope.model.completeButtonDisabled = false;
                            $scope.model.loading = false;
                            $scope.$emit('task-completed-error', {taskId: $scope.taskId, error: errorResponse});
                        });

                }
            };

            $scope.fieldPersonSelected = function (user, field) {
                field.value = user;
            };

            $scope.fieldPersonEmailSelected = function (email, field) {
                field.value = email;
            };
            
            $scope.fieldPersonRemoved = function (user, field) {
                field.value = undefined;
            };

            $scope.fieldGroupSelected = function (group, field) {
                field.value = group;
            };
            
            $scope.fieldGroupRemoved = function (group, field) {
                field.value = undefined;
            };

            $scope.contentUploaded = function (content, field) {
                if (!$scope.model.uploads[field.id]) {
                    $scope.model.uploads[field.id] = [];
                }
                $scope.model.uploads[field.id].push(content);
                $scope.updateContentValue(field);
            };

            $scope.removeContent = function (content, field) {
                if ($scope.model.uploads[field.id]) {

                    $scope.model.uploads[field.id] = jQuery.grep($scope.model.uploads[field.id], function (elem, index) {
                        return elem !== content;
                    });
                    $scope.updateContentValue(field);
                }
            };

            $scope.updateContentValue = function (field) {
                if (!$scope.model.uploads[field.id]) {
                    field.value = undefined;
                } else {
                    var newValue = '';
                    for (var i = 0; i < $scope.model.uploads[field.id].length; i++) {
                        if (i > 0) {
                            newValue += ',';
                        }
                        newValue += $scope.model.uploads[field.id][i].id;
                    }

                    field.value = newValue;
                }
            };

            $scope.handleReadonlyClick = function ($event, field) {
                if ($event.target.id.indexOf('content-') == 0) {
                    // Lookup content object on the field placeholders
                    var id = $event.target.id.substring(8);
                    var content;
                    if (field.params && field.params.placeholders) {
                        for (var i = 0; i < field.params.placeholders.length; i++) {
                            var placeHolder = field.params.placeholders[i];
                            if (placeHolder.type == 'upload') {
                                for (var j = 0; j < placeHolder.value.length; j++) {
                                    var c = placeHolder.value[j];
                                    if (c.id == id) {
                                        content = c;
                                        break;
                                    }
                                }
                            }

                            if (content) {
                                break;
                            }
                        }
                    }

                    if (content) {
                        $scope.showContentDetails(content);
                    }
                }
            };

            $scope.onFieldValueChange = function (field) {
            };

            $scope.uploadInProgress = function (state) {
                if (state !== 'undefined') {
                    $scope.model.uploadInProgress = state;
                }
            };
            
            $scope.createPostData = function() {
                var postData = {values: {}};
                if ($scope.allFormFields) {
                    for (var fieldArrayIndex = 0; fieldArrayIndex < $scope.allFormFields.length; fieldArrayIndex++) {
                        var field = $scope.allFormFields[fieldArrayIndex];
                        if (field && field.isVisible) {

                            if (field.type === 'boolean' && field.value == null) {
                                field.value = false;
                            }

                            if (field && field.type !== 'readonly-text') {
                                if (field.type !== 'readonly' || (field.params && field.params.documentsEditable)) {

                                    if (field.type === 'dropdown' && field.hasEmptyValue !== null && field.hasEmptyValue !== undefined && field.hasEmptyValue === true) {

                                        // Manually filled dropdown
                                        if (field.options !== null && field.options !== undefined && field.options.length > 0) {

                                            var emptyValue = field.options[0];
                                            if (emptyValue.name !== field.value.name) {
                                                postData.values[field.id] = field.value;
                                            }
                                        }

                                    } else {
                                        postData.values[field.id] = field.value;
                                    }
                                }
                            }
                        }
                    }
                }
                return postData;
            };

            // Place methods that are used by controls into an object which is pushed won the container hierarchy
            // Note that these callbacks must be mapped inside the formElement directive as well (workflow-directives.js)
            $scope.controlCallbacks = {
                onFieldValueChange: $scope.onFieldValueChange,
                isEmpty: $scope.isEmpty,
                isEmptyDropdown: $scope.isEmptyDropdown,
                fieldPersonSelected: $scope.fieldPersonSelected,
                fieldPersonEmailSelected: $scope.fieldPersonEmailSelected,
                fieldPersonRemoved: $scope.fieldPersonRemoved,
                fieldGroupSelected: $scope.fieldGroupSelected,
                fieldGroupRemoved: $scope.fieldGroupRemoved,
                removeContent: $scope.removeContent,
                contentUploaded: $scope.contentUploaded,
                uploadInProgress: $scope.uploadInProgress,
                handleReadonlyClick: $scope.handleReadonlyClick,
                clearDate: $scope.clearDate,
                selectToday: $scope.selectToday,
                closeDatePopup: $scope.closeDatePopup
            };
            
            if ($scope.taskId) {
                $scope.model.isTaskForm = true;
            }

        }]);
