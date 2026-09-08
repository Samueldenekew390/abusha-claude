/**
 * ==============================================================================
 * POST-RECEIPT REGISTRATION QUESTIONNAIRE
 * Shown only after a client has uploaded their payment receipt (doc.html).
 * Handles step navigation, validation, and saving answers to Supabase via the
 * `submit_questionnaire` RPC.
 *
 * script.js (loaded before this file) creates a top-level `supabaseClient`.
 * Classic <script> tags share the same global scope, so we can read it
 * directly here, the same way admin-auth.js does.
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------------------------------
  // State Management
  // ----------------------------------------------------------------------------
  const TOTAL_QUESTIONS = 3;
  let currentStep = 1;

  // Store user answers in memory for the active session
  const userAnswers = {
    marital_status: null,
    debt_status: null,
    criminal_record: null
  };

  // Map question step numbers to input group names
  const stepInputNames = {
    1: 'marital_status',
    2: 'debt_status',
    3: 'criminal_record'
  };

  // ----------------------------------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------------------------------
  const questionnaireWrapper = document.getElementById('questionnaire-section');
  const questionnaireCard = document.getElementById('questionnaireCard');
  const cardHeader = document.getElementById('cardHeader');
  const progressSection = document.getElementById('progressSection');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressBarTrack = document.getElementById('progressBarTrack');
  const validationMessage = document.getElementById('validationMessage');
  const validationMessageText = document.getElementById('validationMessageText');
  const questionnaireForm = document.getElementById('questionnaireForm');

  // Nothing to wire up if this page doesn't include the questionnaire markup.
  if (!questionnaireForm) return;

  const DEFAULT_VALIDATION_TEXT = validationMessageText
    ? validationMessageText.textContent
    : 'Please select an answer before continuing.';

  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const steps = [null, step1, step2, step3];

  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  const successScreen = document.getElementById('successScreen');
  const restartBtn = document.getElementById('restartBtn');

  // script.js (loaded before this file) creates a top-level `supabaseClient`.
  function getClient() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    return null;
  }

  // ----------------------------------------------------------------------------
  // Progress Indicator
  // ----------------------------------------------------------------------------
  function updateProgressIndicator() {
    const percentage = Math.round((currentStep / TOTAL_QUESTIONS) * 100);
    progressText.textContent = `Question ${currentStep} of ${TOTAL_QUESTIONS}`;
    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
    progressBarTrack.setAttribute('aria-valuenow', currentStep.toString());
  }

  // ----------------------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------------------
  function showValidationError(message) {
    if (validationMessageText) {
      validationMessageText.textContent = message || DEFAULT_VALIDATION_TEXT;
    }
    validationMessage.removeAttribute('hidden');
    validationMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearValidationError() {
    validationMessage.setAttribute('hidden', '');
  }

  function isCurrentStepAnswered() {
    const inputName = stepInputNames[currentStep];
    return userAnswers[inputName] !== null && userAnswers[inputName] !== undefined;
  }

  // ----------------------------------------------------------------------------
  // Answer Selection
  // ----------------------------------------------------------------------------
  function initializeAnswerSelection() {
    const allRadioInputs = questionnaireForm.querySelectorAll('.option-input');

    allRadioInputs.forEach((input) => {
      input.addEventListener('change', (event) => {
        const target = event.target;
        const groupName = target.name;
        const selectedValue = target.value;

        userAnswers[groupName] = selectedValue;

        const parentStep = target.closest('.question-step');
        if (parentStep) {
          const stepCards = parentStep.querySelectorAll('.option-card');
          stepCards.forEach((card) => card.classList.remove('is-selected'));

          const activeCard = target.closest('.option-card');
          if (activeCard) activeCard.classList.add('is-selected');
        }

        clearValidationError();
      });
    });
  }

  // ----------------------------------------------------------------------------
  // Question Navigation
  // ----------------------------------------------------------------------------
  function showStep(stepNumber) {
    currentStep = stepNumber;
    clearValidationError();

    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      if (i === currentStep) {
        steps[i].removeAttribute('hidden');
      } else {
        steps[i].setAttribute('hidden', '');
      }
    }

    if (currentStep === 1) {
      backBtn.setAttribute('hidden', '');
    } else {
      backBtn.removeAttribute('hidden');
    }

    if (currentStep === TOTAL_QUESTIONS) {
      nextBtn.setAttribute('hidden', '');
      submitBtn.removeAttribute('hidden');
    } else {
      nextBtn.removeAttribute('hidden');
      submitBtn.setAttribute('hidden', '');
    }

    updateProgressIndicator();
  }

  nextBtn.addEventListener('click', () => {
    if (!isCurrentStepAnswered()) {
      showValidationError();
      return;
    }
    if (currentStep < TOTAL_QUESTIONS) showStep(currentStep + 1);
  });

  backBtn.addEventListener('click', () => {
    clearValidationError();
    if (currentStep > 1) showStep(currentStep - 1);
  });

  // ----------------------------------------------------------------------------
  // Submission — validates all 3 questions, saves to Supabase, then shows the
  // success screen. Only runs once the client has already uploaded a receipt,
  // since this section stays hidden until then (see doc.html / script.js).
  // ----------------------------------------------------------------------------
  questionnaireForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!isCurrentStepAnswered()) {
      showValidationError();
      return;
    }

    const allAnswered = Object.values(userAnswers).every((val) => val !== null);
    if (!allAnswered) {
      showValidationError();
      return;
    }

    const params = new URLSearchParams(location.search);
    const otp = params.get('otp');

    if (!otp) {
      showValidationError('Missing OTP in the page URL. Please reopen your document link.');
      return;
    }

    const client = getClient();
    if (!client) {
      showValidationError('Supabase is not configured — check the browser console.');
      return;
    }

    clearValidationError();
    if (submitBtn) submitBtn.disabled = true;

    try {
      const { error } = await client.rpc('submit_questionnaire', {
        p_otp: otp,
        p_marital_status: userAnswers.marital_status,
        p_debt_status: userAnswers.debt_status,
        p_criminal_record: userAnswers.criminal_record,
      });

      if (error) throw error;

      cardHeader.setAttribute('hidden', '');
      progressSection.setAttribute('hidden', '');
      questionnaireForm.setAttribute('hidden', '');
      clearValidationError();

      successScreen.removeAttribute('hidden');
      successScreen.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('[Questionnaire] Submit error:', error);
      showValidationError(error.message || 'Could not submit your answers. Please try again.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // ----------------------------------------------------------------------------
  // Restart Handler
  // ----------------------------------------------------------------------------
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      userAnswers.marital_status = null;
      userAnswers.debt_status = null;
      userAnswers.criminal_record = null;

      questionnaireForm.reset();

      const allCards = questionnaireForm.querySelectorAll('.option-card');
      allCards.forEach((card) => card.classList.remove('is-selected'));

      cardHeader.removeAttribute('hidden');
      progressSection.removeAttribute('hidden');
      questionnaireForm.removeAttribute('hidden');
      successScreen.setAttribute('hidden', '');

      showStep(1);
    });
  }

  // ----------------------------------------------------------------------------
  // Expose a hook so script.js can reveal this section right after a receipt
  // upload succeeds, without waiting for a page reload.
  // ----------------------------------------------------------------------------
  window.revealQuestionnaire = function revealQuestionnaire() {
    if (questionnaireWrapper) questionnaireWrapper.hidden = false;
  };

  window.showQuestionnaireCompleted = function showQuestionnaireCompleted() {
    if (!questionnaireWrapper) return;
    questionnaireWrapper.hidden = false;
    if (questionnaireCard) {
      questionnaireCard.innerHTML = `
        <h2 class="card-title">Questionnaire Completed</h2>
        <p class="card-subtitle">Thank you — your registration questionnaire has already been submitted.</p>
      `;
    }
  };

  initializeAnswerSelection();
  showStep(1);
});
