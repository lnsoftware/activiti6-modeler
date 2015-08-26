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
/**
 * Controller for user mgmt
 */
activitiApp.controller('IdmUserMgmtController', ['$rootScope', '$scope', '$translate', '$http', '$timeout','$location', '$modal',
    function ($rootScope, $scope, $translate, $http, $timeout, $location, $modal) {

        if (!$scope.hasAdminCapability()) {
            $scope.backToLanding();
        }

        $rootScope.setMainPageById('userMgmt');

        $scope.model = {
            loading: false,
            sorts: [
                {id: 'createdDesc', name: $translate.instant('IDM.USER-MGMT.FILTERS.SORT-DATE-NEWEST')},
                {id: 'createdAsc', name: $translate.instant('IDM.USER-MGMT.FILTERS.SORT-DATE-OLDEST')},
                {id: 'emailAsc', name: $translate.instant('IDM.USER-MGMT.FILTERS.SORT-EMAIL-A')},
                {id: 'emailDesc', name: $translate.instant('IDM.USER-MGMT.FILTERS.SORT-EMAIL-Z')}
            ],
            waiting: false,
            delayed: false,
            selectedUsers: {},
            selectedUserCount: 0,
            start: 0
        };

        $scope.model.activeSort = $scope.model.sorts[0];

        $scope.loadUserSummary = function() {
            $scope.model.loading = true;

            var summaryParams = {};
            $http({method: 'GET', url: ACTIVITI.CONFIG.contextRoot + '/app/rest/admin/users/summary', params: summaryParams}).
                success(function(data, status, headers, config) {
                    $scope.model.summary = data;
                }).error(function(data, status, headers, config) {
                    if(status == 403) {
                        $rootScope.backToLanding();
                    }
                });
        };

        $scope.clearSelectedUsers = function() {
            $scope.model.selectedUsers = {};
            $scope.model.selectedUserCount = 0;
        };

        $scope.loadUsers = function() {
            $scope.clearSelectedUsers();
            $scope.model.loading = true;
            var params = {
                filter: $scope.model.pendingFilterText,
                company: $scope.model.pendingCompanyText,
                sort: $scope.model.activeSort.id,
                start: $scope.model.start
            };

            $http({method: 'GET', url: ACTIVITI.CONFIG.contextRoot + '/app/rest/admin/users', params: params}).
                success(function(data, status, headers, config) {
                    data.moreUsers = data.start + data.size < data.total;
                    $scope.model.users = data;
                    $scope.model.loading = false;
                }).
                error(function(data, status, headers, config) {
                    $scope.model.loading = false;

                    if(status == 403) {
                        console.log('Forbidden!');
                    }
                });
        };


        $scope.refreshDelayed = function() {
            // If already waiting, another wait-cycle will be done
            // after the current wait is over
            if($scope.model.waiting) {
                $scope.model.delayed = true;
            } else {
                $scope.scheduleDelayedRefresh();
            }
        };

        $scope.scheduleDelayedRefresh = function() {
            $scope.model.waiting = true;

            $timeout(function() {
                $scope.model.waiting = false;
                if( $scope.model.delayed) {
                    $scope.model.delayed = false;
                    // Delay again
                    $scope.scheduleDelayedRefresh();
                } else {
                    // Actually do the refresh-call, after resetting start
                    $scope.model.start = 0;
                    $scope.loadUsers();
                    $scope.loadUserSummary();
                }
            }, 100);
        };

        $scope.showNextUsers = function() {
            if($scope.model.users) {
                $scope.model.start = $scope.model.users.start + $scope.model.users.size;
                $scope.loadUsers();
            }
        };

        $scope.showPreviousUsers = function() {
            if($scope.model.users) {
                $scope.model.start = Math.max(0, $scope.model.users.start - $scope.model.users.size);
                $scope.loadUsers();
            }
        };

        $scope.activateSort = function(sort) {
            $scope.model.activeSort = sort;
            $scope.model.start = 0;
            $scope.loadUsers();
        };

        $scope.toggleUserSelection = function(user) {
            if($scope.model.selectedUsers[user.id]) {
                delete $scope.model.selectedUsers[user.id];
                $scope.model.selectedUserCount -= 1;
            }  else {
                $scope.model.selectedUsers[user.id] = true;
                $scope.model.selectedUserCount +=1;
            }

        };

        $scope.addUser = function() {
            $scope.model.errorMessage = undefined;
            $scope.model.user = undefined;
            _internalCreateModal({
                scope: $scope,
                template: 'views/popup/idm-user-create.html?version=' + new Date().getTime(),
                show: true
            }, $modal, $scope);
        };

        $scope.editUserAccountType = function() {

            $scope.model.mode = 'type';

            _internalCreateModal({
                scope: $scope,
                template: 'views/popup/idm-user-type-edit.html',
                show: true
            }, $modal, $scope);

        };

        $scope.editUserDetails = function() {

            $scope.model.user = undefined;
            var selectedUsers = $scope.getSelectedUsers();
            if (selectedUsers && selectedUsers.length == 1) {
                $scope.model.user = selectedUsers[0];
            }

            $scope.model.errorMessage = undefined;
            _internalCreateModal({
                scope: $scope,
                template: 'views/popup/idm-user-create.html?version=' + new Date().getTime(),
                show: true
            }, $modal, $scope);
        };

        $scope.editUserPassword = function() {

            $scope.model.mode = 'password';

            _internalCreateModal({
                scope: $scope,
                template: 'views/popup/idm-user-password-change.html',
                show: true
            }, $modal, $scope);

        };

        $scope.getSelectedUsers = function() {
            var selected = [];
            for(var i = 0; i<$scope.model.users.size; i++) {
                var user = $scope.model.users.data[i];
                if(user) {
                    for(var prop in $scope.model.selectedUsers) {
                        if(user.id == prop) {
                            selected.push(user);
                            break;
                        }
                    }
                }
            }

            return selected;
        };

        $scope.loadUsers();
        $scope.loadUserSummary();

    }]);


/**
 * Controller for the create user dialog
 */
activitiApp.controller('IdmCreateUserPopupController', ['$rootScope', '$scope', '$http',
    function ($rootScope, $scope, $http) {

        if (!$scope.hasAdminCapability()) {
            $scope.backToLanding();
        }


        if ($scope.model.user === null || $scope.model.user === undefined) {

            $scope.model.user = {
            };
        }

        $scope.createNewUser = function () {
            if (!$scope.model.user.email) {
                return;
            }

            var model = $scope.model;
            model.loading = true;

            var data = {
                email: model.user.email,
                firstName: model.user.firstName,
                lastName: model.user.lastName,
                password: model.user.password,
                company: model.user.company
            };

            $http({method: 'POST', url: ACTIVITI.CONFIG.contextRoot + '/app/rest/admin/users', data: data}).
                success(function (data, status, headers, config) {

                    $rootScope.addAlert('New user created', 'info');
                    $scope.loadUsers();
                    $scope.loadUserSummary();

                    $scope.model.loading = false;
                    $scope.$hide();
                }).
                error(function (data, status, headers, config) {
                    $scope.model.loading = false;
                    if (data && data.message) {
                        $rootScope.addAlert(data.message, 'error');
                    } else {
                        $rootScope.addAlert('Error while updating user status', 'error');
                    }

                    if (status == 403) {
                        $scope.model.errorMessage = "Forbidden";
                    } else if (status == 409) {
                        $scope.model.errorMessage = "A user with that email address already exists";
                    } else {
                        $scope.$hide();
                    }
                });
        };

        $scope.editUserDetails = function() {
            if (!$scope.model.user.email) {
                return;
            }

            var model = $scope.model;
            model.loading = true;

            var data = {
                email: model.user.email,
                firstName: model.user.firstName,
                lastName: model.user.lastName,
                company: model.user.company
            };

            $http({method: 'PUT', url: ACTIVITI.CONFIG.contextRoot + '/app/rest/admin/users/' + $scope.model.user.id, data: data}).
                success(function (data, status, headers, config) {

                    $scope.loadUsers();
                    $scope.loadUserSummary();

                    $scope.model.loading = false;
                    $scope.$hide();
                }).
                error(function (data, status, headers, config) {
                    $scope.model.loading = false;
                    if (data && data.message) {
                        $rootScope.addAlert(data.message, 'error');
                    } else {
                        $rootScope.addAlert('Error while updating user status', 'error');
                    }

                    if (status == 403) {
                        $scope.model.errorMessage = "Forbidden";
                    } else if (status == 409) {
                        $scope.model.errorMessage = "A user with that email address already exists";
                    } else {
                        $scope.$hide();
                    }
                });
        };

        $scope.cancel = function () {
            if (!$scope.model.loading) {
                $scope.$hide();
            }
        };

    }]);

/**
 * Controller for the bulk update dialog
 */
activitiApp.controller('IdmUserBulkUpdatePopupController', ['$rootScope', '$scope', '$http',
  function ($rootScope, $scope, $http) {

      if (!$scope.hasAdminCapability()) {
          $scope.backToLanding();
      }

      if($scope.model.mode == 'status') {
            $scope.model.updateUsers = {
                sendNotifications: false
            };
        } else if ($scope.model.mode == 'type') {
            $scope.model.updateUsers = {
                type: $scope.model.typeFilters[1]
            };
        } else if ($scope.model.mode == 'password') {
            $scope.model.updateUsers = {
                password: ''
            };
        }

     $scope.updateUsers = function () {
       $scope.model.loading = true;
       var users = $scope.getSelectedUsers();
       var userIds = [];
       for(var i=0; i<users.length; i++) {
         var user = users[i];
         if(user && user.id) {
           userIds.push(user.id);
         }
       }

       var data = {
           users: userIds
       };

       if($scope.model.mode == 'status') {
         data.status = $scope.model.updateUsers.status.id;
         data.sendNotifications = $scope.model.updateUsers.sendNotifications
       } else if ($scope.model.mode == 'type') {
         data.accountType = $scope.model.updateUsers.type.id;
       } else if ($scope.model.mode == 'password') {
         data.password = $scope.model.updateUsers.password;
       }

       $http({method: 'PUT', url: ACTIVITI.CONFIG.contextRoot + '/app/rest/admin/users', data: data})
           .success(function(data, status, headers, config) {
                $scope.$hide();
                $scope.model.loading = false;
                $rootScope.addAlert($scope.model.selectedUserCount + ' user(s) updated', 'info');
                $scope.loadUsers();
                $scope.loadUserSummary();

         }).
         error(function(data, status, headers, config) {
            $scope.model.loading = false;
            if(data && data.message) {
              $rootScope.addAlert(data.message, 'error');
            } else {
              $rootScope.addAlert('Error while updating user status', 'error');
            }
            $scope.$hide();
            if(status == 403) {
                console.log('Not permitted!');
            }
         });
    };

    $scope.setStatus = function(newStatus) {
      $scope.model.updateUsers.status = newStatus;
    };

    $scope.setType = function(newType) {
      $scope.model.updateUsers.type = newType;
    };

    $scope.cancel = function () {
      if(!$scope.model.loading) {
        $scope.$hide();
      }
    };

}]);

