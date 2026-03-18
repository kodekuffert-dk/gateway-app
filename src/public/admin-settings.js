(function () {
  function safeParseJsonArray(value) {
    if (!value) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue) ? parsedValue.map(Number) : [];
    } catch (error) {
      return [];
    }
  }

  function uniqueNumbers(values) {
    return Array.from(new Set(values.map(Number).filter((value) => Number.isInteger(value) && value > 0)));
  }

  function buildAdminUrl(teamState, courseState, hash) {
    const searchParams = new URLSearchParams(window.location.search);

    if (teamState.mode === 'create') {
      searchParams.set('team', 'new');
    } else if (teamState.id) {
      searchParams.set('team', String(teamState.id));
    } else {
      searchParams.delete('team');
    }

    if (courseState.mode === 'create') {
      searchParams.set('course', 'new');
    } else if (courseState.id) {
      searchParams.set('course', String(courseState.id));
    } else {
      searchParams.delete('course');
    }

    const query = searchParams.toString();
    return `${window.location.pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  }

  function createAdminController(root) {
    const teamButtons = Array.from(root.querySelectorAll('[data-admin-action="select-team"]'));
    const courseButtons = Array.from(root.querySelectorAll('[data-admin-action="select-course"]'));
    const teamForm = root.querySelector('[data-team-form]');
    const courseForm = root.querySelector('[data-course-form]');
    const createTeamButton = root.querySelector('[data-admin-action="create-team"]');
    const createCourseButton = root.querySelector('[data-admin-action="create-course"]');

    if (!teamForm || !courseForm) {
      return;
    }

    const teamState = {
      mode: root.dataset.initialTeamMode || 'edit',
      id: root.dataset.initialTeamId || '',
    };

    const courseState = {
      mode: root.dataset.initialCourseMode || 'edit',
      id: root.dataset.initialCourseId || '',
    };

    const labels = {
      teamCreateTitle: root.dataset.labelTeamCreateTitle || 'Opret hold',
      teamDefaultTitle: root.dataset.labelTeamDefaultTitle || 'Holdadministration',
      teamCreateDescription: root.dataset.labelTeamCreateDescription || 'Brug samme detailvisning til at oprette et nyt hold.',
      teamEditDescription: root.dataset.labelTeamEditDescription || 'Redigér oplysninger og kursustilknytninger for det valgte hold.',
      teamEmptyDescription: root.dataset.labelTeamEmptyDescription || 'Vælg et hold i listen for at åbne administrationen.',
      teamSubmitCreate: root.dataset.labelTeamSubmitCreate || 'Opret',
      teamSubmitEdit: root.dataset.labelTeamSubmitEdit || 'Gem',
      courseCreateTitle: root.dataset.labelCourseCreateTitle || 'Opret kursus',
      courseDefaultTitle: root.dataset.labelCourseDefaultTitle || 'Kursusadministration',
      courseCreateDescription: root.dataset.labelCourseCreateDescription || 'Brug samme detailvisning til at oprette et nyt kursus.',
      courseEditDescription: root.dataset.labelCourseEditDescription || 'Redigér titel og beskrivelse for det valgte kursus.',
      courseEmptyDescription: root.dataset.labelCourseEmptyDescription || 'Vælg et kursus i listen for at åbne administrationen.',
      courseSubmitCreate: root.dataset.labelCourseSubmitCreate || 'Opret',
      courseSubmitEdit: root.dataset.labelCourseSubmitEdit || 'Gem',
    };

    const teamTitle = root.querySelector('[data-team-detail-title]');
    const teamDescription = root.querySelector('[data-team-detail-description]');
    const teamIdInput = root.querySelector('[data-team-id-input]');
    const teamNameInput = root.querySelector('[data-team-name-input]');
    const teamStartDateInput = root.querySelector('[data-team-start-date-input]');
    const teamEndDateInput = root.querySelector('[data-team-end-date-input]');
    const teamSubmitButton = root.querySelector('[data-team-submit-button]');
    const selectedCourseInput = root.querySelector('[data-selected-course-input]');
    const teamCourseCheckboxes = Array.from(root.querySelectorAll('[data-team-course-checkbox]'));
    const selectedCourseSyncInputs = Array.from(root.querySelectorAll('[data-sync-selected-course]'));

    const courseTitle = root.querySelector('[data-course-detail-title]');
    const courseDescription = root.querySelector('[data-course-detail-description]');
    const courseIdInput = root.querySelector('[data-course-id-input]');
    const courseTitleInput = root.querySelector('[data-course-title-input]');
    const courseDescriptionInput = root.querySelector('[data-course-description-input]');
    const courseSubmitButton = root.querySelector('[data-course-submit-button]');
    const selectedTeamInput = root.querySelector('[data-selected-team-input]');
    const selectedTeamSyncInputs = Array.from(root.querySelectorAll('[data-sync-selected-team]'));

    function getTeamButtonById(teamId) {
      return teamButtons.find((button) => button.dataset.teamId === String(teamId)) || null;
    }

    function getCourseButtonById(courseId) {
      return courseButtons.find((button) => button.dataset.courseId === String(courseId)) || null;
    }

    function syncHiddenSelectionInputs() {
      const selectedCourseValue = courseState.mode === 'create' ? 'new' : (courseState.id || '');
      const selectedTeamValue = teamState.mode === 'create' ? 'new' : (teamState.id || '');

      if (selectedCourseInput) {
        selectedCourseInput.value = selectedCourseValue;
      }
      if (selectedTeamInput) {
        selectedTeamInput.value = selectedTeamValue;
      }

      selectedCourseSyncInputs.forEach((input) => {
        input.value = selectedCourseValue;
      });

      selectedTeamSyncInputs.forEach((input) => {
        input.value = selectedTeamValue;
      });
    }

    function updateUrl(hash) {
      const nextUrl = buildAdminUrl(teamState, courseState, hash);
      window.history.replaceState(null, '', nextUrl);
    }

    function setActiveButton(buttons, activeId, isCreateMode, idKey) {
      buttons.forEach((button) => {
        const isActive = !isCreateMode && button.dataset[idKey] === String(activeId);
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function populateTeamFormFromState() {
      const selectedButton = teamState.mode === 'edit' ? getTeamButtonById(teamState.id) : null;
      const selectedCourseIds = selectedButton ? uniqueNumbers(safeParseJsonArray(selectedButton.dataset.teamCourseIds)) : [];
      const isEmptyState = teamState.mode !== 'create' && !selectedButton;

      teamForm.action = teamState.mode === 'create' ? '/admin/teams/create' : '/admin/teams/update';
      teamTitle.textContent = teamState.mode === 'create'
        ? labels.teamCreateTitle
        : (selectedButton ? selectedButton.dataset.teamName : labels.teamDefaultTitle);
      teamDescription.textContent = teamState.mode === 'create'
        ? labels.teamCreateDescription
        : (isEmptyState
          ? labels.teamEmptyDescription
          : labels.teamEditDescription);
      teamNameInput.value = selectedButton ? selectedButton.dataset.teamName : '';
      teamStartDateInput.value = selectedButton ? (selectedButton.dataset.teamStartDate || '') : '';
      teamEndDateInput.value = selectedButton ? (selectedButton.dataset.teamEndDate || '') : '';
      teamSubmitButton.textContent = teamState.mode === 'create' ? labels.teamSubmitCreate : labels.teamSubmitEdit;

      teamIdInput.value = selectedButton ? selectedButton.dataset.teamId : '';
      teamIdInput.disabled = teamState.mode === 'create';

      teamCourseCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectedCourseIds.includes(Number(checkbox.value));
      });

      setActiveButton(teamButtons, teamState.id, teamState.mode === 'create', 'teamId');
    }

    function populateCourseFormFromState() {
      const selectedButton = courseState.mode === 'edit' ? getCourseButtonById(courseState.id) : null;
      const isEmptyState = courseState.mode !== 'create' && !selectedButton;

      courseForm.action = courseState.mode === 'create' ? '/admin/courses/create' : '/admin/courses/update';
      courseTitle.textContent = courseState.mode === 'create'
        ? labels.courseCreateTitle
        : (selectedButton ? selectedButton.dataset.courseTitle : labels.courseDefaultTitle);
      courseDescription.textContent = courseState.mode === 'create'
        ? labels.courseCreateDescription
        : (isEmptyState
          ? labels.courseEmptyDescription
          : labels.courseEditDescription);
      courseTitleInput.value = selectedButton ? selectedButton.dataset.courseTitle : '';
      courseDescriptionInput.value = selectedButton ? (selectedButton.dataset.courseDescription || '') : '';
      courseSubmitButton.textContent = courseState.mode === 'create' ? labels.courseSubmitCreate : labels.courseSubmitEdit;

      courseIdInput.value = selectedButton ? selectedButton.dataset.courseId : '';
      courseIdInput.disabled = courseState.mode === 'create';

      setActiveButton(courseButtons, courseState.id, courseState.mode === 'create', 'courseId');
    }

    function selectTeam(teamId, hash) {
      teamState.mode = 'edit';
      teamState.id = String(teamId);
      populateTeamFormFromState();
      syncHiddenSelectionInputs();
      updateUrl(hash || 'team-detail');
    }

    function selectCourse(courseId, hash) {
      courseState.mode = 'edit';
      courseState.id = String(courseId);
      populateCourseFormFromState();
      syncHiddenSelectionInputs();
      updateUrl(hash || 'course-detail');
    }

    function createTeam(hash) {
      teamState.mode = 'create';
      teamState.id = '';
      populateTeamFormFromState();
      syncHiddenSelectionInputs();
      updateUrl(hash || 'team-detail');
    }

    function createCourse(hash) {
      courseState.mode = 'create';
      courseState.id = '';
      populateCourseFormFromState();
      syncHiddenSelectionInputs();
      updateUrl(hash || 'course-detail');
    }

    teamButtons.forEach((button) => {
      button.addEventListener('click', function () {
        selectTeam(button.dataset.teamId, 'team-detail');
      });
    });

    courseButtons.forEach((button) => {
      button.addEventListener('click', function () {
        selectCourse(button.dataset.courseId, 'course-detail');
      });
    });

    if (createTeamButton) {
      createTeamButton.addEventListener('click', function () {
        createTeam('team-detail');
      });
    }

    if (createCourseButton) {
      createCourseButton.addEventListener('click', function () {
        createCourse('course-detail');
      });
    }

    populateTeamFormFromState();
    populateCourseFormFromState();
    syncHiddenSelectionInputs();
  }

  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.admin-settings-page');
    if (!root) {
      return;
    }

    createAdminController(root);
  });
}());
