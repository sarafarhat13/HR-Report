import { useCallback, useMemo, useState } from 'react';
import {
  ModusWcAutocomplete,
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTable,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import type {
  IAutocompleteItem,
  IInputFeedbackProp,
  ITableColumn,
  ModusWcAutocompleteCustomEvent,
  ModusWcDateCustomEvent,
  ModusWcTableCustomEvent,
} from '@trimble-oss/moduswebcomponents';
import { useRole } from '../roles';
import {
  COMPANIES,
  EMPLOYEES,
  ENTERPRISES,
  EMPTY_STATE_COMPANY_CODE,
  runAudit,
  type AuditResult,
  type CheckRecord,
  type SearchParams,
} from '../data/mockData';

const INITIAL_PARAMS: SearchParams = {
  enterpriseId: '',
  companyCode: '',
  employeeCode: '',
  startDate: '',
  endDate: '',
};

type FieldErrors = Partial<Record<keyof SearchParams, string>>;

function errorFeedback(message?: string): IInputFeedbackProp | undefined {
  return message ? { level: 'error', message } : undefined;
}

/** Builds the chip badges for a row inside the table's shadow DOM. */
function renderBadges(payType: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'badge-cell';

  const addChip = (label: string, variant: 'filled' | 'outline') => {
    const chip = document.createElement('modus-wc-chip');
    chip.setAttribute('label', label);
    chip.setAttribute('show-remove', 'false');
    chip.setAttribute('size', 'sm');
    chip.setAttribute('variant', variant);
    wrap.appendChild(chip);
  };

  if (/bonus/i.test(payType)) addChip('Bonus', 'filled');
  if (/final/i.test(payType)) addChip('Final Pay', 'outline');
  return wrap;
}

const PAYSTUB_CONFIRM_MODAL_ID = 'paystub-access-confirm-dialog';

/** Mock paystub PDF download (MVP — production would call a secured API). */
function downloadPaystubPdf(check: CheckRecord): void {
  console.log(
    'Audit trail: paystub accessed — check %s, employee %s',
    check.checkNumber,
    check.employeeCode
  );
  const lines = [
    'Paystub (demonstration document)',
    `Check #: ${check.checkNumber}`,
    `Check date: ${check.checkDate}`,
    `Employee: ${check.employeeCode}`,
    `Company: ${check.companyCode}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `paystub-check-${check.checkNumber}.pdf`;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PaystubAuditReport() {
  const role = useRole();
  const isGlobalAdmin = role === 'globalAdmin';
  const [params, setParams] = useState<SearchParams>(INITIAL_PARAMS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<AuditResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  // Bumped on reset to remount the (uncontrolled-text) search pickers cleanly.
  const [pickerResetKey, setPickerResetKey] = useState(0);
  const [pendingCheck, setPendingCheck] = useState<CheckRecord | null>(null);

  const openPaystubConfirm = useCallback((check: CheckRecord) => {
    setPendingCheck(check);
    const dialog = document.getElementById(
      PAYSTUB_CONFIRM_MODAL_ID
    ) as HTMLDialogElement | null;
    dialog?.showModal();
  }, []);

  const closePaystubConfirm = useCallback(() => {
    const dialog = document.getElementById(
      PAYSTUB_CONFIRM_MODAL_ID
    ) as HTMLDialogElement | null;
    dialog?.close();
    setPendingCheck(null);
  }, []);

  const confirmViewPaystub = useCallback(() => {
    if (pendingCheck) {
      downloadPaystubPdf(pendingCheck);
    }
    closePaystubConfirm();
  }, [pendingCheck, closePaystubConfirm]);

  // Stable list of enterprises for the searchable picker. The ID lives in the
  // label so typing either the name or the ID narrows the built-in filter.
  const enterpriseItems = useMemo<IAutocompleteItem[]>(
    () =>
      ENTERPRISES.map((ent) => ({
        label: `${ent.name} — ${ent.id}`,
        value: ent.id,
        visibleInMenu: true,
      })),
    []
  );

  // Stable list of companies for the searchable picker. A trailing preview
  // option lets testers trigger the empty state without free-text entry.
  const companyItems = useMemo<IAutocompleteItem[]>(
    () => [
      ...COMPANIES.map((co) => ({
        label: `${co.name} — ${co.code}`,
        value: co.code,
        visibleInMenu: true,
      })),
      {
        label: `Preview empty state — ${EMPTY_STATE_COMPANY_CODE}`,
        value: EMPTY_STATE_COMPANY_CODE,
        visibleInMenu: true,
      },
    ],
    []
  );

  // Stable list of employees for the searchable picker. Codes live in the label
  // so typing either the name or the code narrows the built-in filter.
  const employeeItems = useMemo<IAutocompleteItem[]>(
    () =>
      EMPLOYEES.map((emp) => ({
        label: `${emp.name} — ${emp.code}`,
        value: emp.code,
        visibleInMenu: true,
      })),
    []
  );

  // Generic controlled-input updater keeps every handler stable and leak-free.
  const updateField = useCallback(
    <K extends keyof SearchParams>(field: K, value: SearchParams[K]) => {
      setParams((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    },
    []
  );

  const onEnterpriseSelect = useCallback(
    (e: ModusWcAutocompleteCustomEvent<IAutocompleteItem>) => {
      updateField('enterpriseId', e.detail.value);
    },
    [updateField]
  );

  const onEnterpriseClear = useCallback(() => {
    updateField('enterpriseId', '');
  }, [updateField]);

  const onCompanySelect = useCallback(
    (e: ModusWcAutocompleteCustomEvent<IAutocompleteItem>) => {
      updateField('companyCode', e.detail.value);
    },
    [updateField]
  );

  const onCompanyClear = useCallback(() => {
    updateField('companyCode', '');
  }, [updateField]);

  const onEmployeeSelect = useCallback(
    (e: ModusWcAutocompleteCustomEvent<IAutocompleteItem>) => {
      updateField('employeeCode', e.detail.value);
    },
    [updateField]
  );

  const onEmployeeClear = useCallback(() => {
    updateField('employeeCode', '');
  }, [updateField]);

  const onDate = useCallback(
    (field: 'startDate' | 'endDate') => (e: ModusWcDateCustomEvent<InputEvent>) =>
      updateField(field, e.target.value),
    [updateField]
  );

  const validate = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    if (isGlobalAdmin && !params.enterpriseId.trim()) {
      next.enterpriseId = 'Enterprise ID is required.';
    }
    if (!params.startDate) next.startDate = 'Start date is required.';
    if (!params.endDate) next.endDate = 'End date is required.';
    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      next.endDate = 'End date must be on or after the start date.';
    }
    return next;
  }, [isGlobalAdmin, params]);

  const handleRun = useCallback(() => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setResult(null);
      setHasSearched(false);
      return;
    }
    setResult(runAudit(params, role));
    setHasSearched(true);
  }, [params, role, validate]);

  const handleReset = useCallback(() => {
    setParams(INITIAL_PARAMS);
    setErrors({});
    setResult(null);
    setHasSearched(false);
    setPickerResetKey((k) => k + 1);
  }, []);

  // Stable column defs so the table never re-renders into a render loop.
  const columns = useMemo<ITableColumn[]>(
    () => [
      {
        id: 'checkNumber',
        header: 'Check Number',
        accessor: 'checkNumber',
        sortable: true,
        cellRenderer: (value, row) => {
          const id = String(value);
          const link = document.createElement('a');
          link.href = '#';
          link.textContent = id;
          link.className = 'check-link';
          link.title = 'View paystub';
          link.addEventListener('click', (evt) => {
            evt.preventDefault();
            openPaystubConfirm(row as CheckRecord);
          });
          return link;
        },
      },
      { id: 'checkDate', header: 'Check Date', accessor: 'checkDate', sortable: true },
      { id: 'checkType', header: 'Check Type', accessor: 'checkType', sortable: true },
      { id: 'companyCode', header: 'Company Code', accessor: 'companyCode', sortable: true },
      { id: 'employeeCode', header: 'Employee Code', accessor: 'employeeCode', sortable: true },
      {
        id: 'badges',
        header: 'Pay Type',
        accessor: 'payType',
        sortable: false,
        cellRenderer: (value) => renderBadges(String(value ?? '')),
      },
    ],
    [openPaystubConfirm]
  );

  const rows = result?.rows ?? [];
  const showResults = hasSearched && rows.length > 0;
  const showEmptyState = hasSearched && rows.length === 0;

  const tableData = useMemo<Record<string, unknown>[]>(
    () => (result?.rows ?? []).map((r: CheckRecord) => ({ ...r })),
    [result]
  );

  return (
    <div className="report-page">
      <header className="report-header">
        <ModusWcTypography hierarchy="h1" size="2xl" weight="bold">
          Paystub Check Audit Report
        </ModusWcTypography>
        <ModusWcTypography hierarchy="p" size="sm" customClass="report-subtitle">
          Cross-reference generated checks against what loaded into Employee
          Self-Service (ESS) to quickly surface missing paystubs.
        </ModusWcTypography>
      </header>

      {/* --- Search parameters --- */}
      <ModusWcCard bordered padding="comfortable" customClass="search-card">
        <span slot="title">Search Parameters</span>
        <form
          className="search-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div className="form-grid">
            {isGlobalAdmin && (
              <ModusWcAutocomplete
                key={`enterprise-${pickerResetKey}`}
                label="Enterprise ID"
                required
                bordered
                includeSearch
                includeClear
                showMenuOnFocus
                minChars={0}
                items={enterpriseItems}
                placeholder="Search by name or ID"
                feedback={errorFeedback(errors.enterpriseId)}
                onItemSelect={onEnterpriseSelect}
                onClearClick={onEnterpriseClear}
              />
            )}

            <ModusWcAutocomplete
              key={`company-${pickerResetKey}`}
              label="Company Code"
              bordered
              includeSearch
              includeClear
              showMenuOnFocus
              minChars={0}
              items={companyItems}
              placeholder="Optional — search by name or code"
              feedback={errorFeedback(errors.companyCode)}
              onItemSelect={onCompanySelect}
              onClearClick={onCompanyClear}
            />

            <ModusWcAutocomplete
              key={`employee-${pickerResetKey}`}
              label="Employee"
              bordered
              includeSearch
              includeClear
              showMenuOnFocus
              minChars={0}
              items={employeeItems}
              placeholder="All employees — search by name or code"
              feedback={errorFeedback(errors.employeeCode)}
              onItemSelect={onEmployeeSelect}
              onClearClick={onEmployeeClear}
            />

            <div className="date-range">
              <ModusWcDate
                label="Check Date - Start"
                required
                bordered
                format="mm/dd/yyyy"
                value={params.startDate}
                feedback={errorFeedback(errors.startDate)}
                onInputChange={onDate('startDate')}
              />

              <ModusWcDate
                label="Check Date - End"
                required
                bordered
                format="mm/dd/yyyy"
                value={params.endDate}
                feedback={errorFeedback(errors.endDate)}
                onInputChange={onDate('endDate')}
              />
            </div>
          </div>

          <ModusWcTypography hierarchy="p" size="xs" customClass="form-hint">
            Tip: choose the Company Code “Preview empty state” option to preview
            the no-results state.
          </ModusWcTypography>

          <div className="form-actions">
            <ModusWcButton color="neutral" variant="outlined" type="button" onButtonClick={handleReset}>
              Clear
            </ModusWcButton>
            <ModusWcButton color="primary" type="submit" onButtonClick={handleRun}>
              Run Report
            </ModusWcButton>
          </div>
        </form>
      </ModusWcCard>

      {/* --- Results table --- */}
      {showResults && (
        <ModusWcCard bordered padding="comfortable" customClass="table-card">
          <span slot="title">Total Checks Found</span>
          <ModusWcTable
            columns={columns}
            data={tableData}
            sortable
            paginated
            showPageSizeSelector
            pageSizeOptions={[5, 10, 15]}
            density="comfortable"
            caption="Paystub checks loaded into Employee Self-Service"
            onPaginationChange={(e: ModusWcTableCustomEvent<unknown>) =>
              console.log('pageChange', e.detail)
            }
            onSortChange={(e: ModusWcTableCustomEvent<unknown>) =>
              console.log('sortChange', e.detail)
            }
          />
        </ModusWcCard>
      )}

      {/* --- Empty state --- */}
      {showEmptyState && (
        <div className="empty-state">
          <ModusWcTypography hierarchy="p" size="lg" weight="semibold">
            No results have been found.
          </ModusWcTypography>
        </div>
      )}

      {!hasSearched && (
        <div className="empty-state">
          <ModusWcTypography hierarchy="p" size="md" customClass="report-subtitle">
            Enter your search parameters and select “Run Report” to audit paystub
            checks.
          </ModusWcTypography>
        </div>
      )}

      <ModusWcModal
        modalId={PAYSTUB_CONFIRM_MODAL_ID}
        position="center"
        aria-label="Confirm paystub access"
      >
        <ModusWcTypography
          slot="header"
          hierarchy="h2"
          size="lg"
          weight="semibold"
          label="Confirm Paystub Access"
        />

        <div slot="content" className="paystub-confirm-content">
          <ModusWcTypography hierarchy="p" size="md">
            You are accessing sensitive payroll information. This action will be
            logged in the audit trail with your account details, timestamp, and
            IP address for compliance and security monitoring.
          </ModusWcTypography>
          <ModusWcTypography hierarchy="p" size="md" weight="semibold">
            Are you sure you want to view this check?
          </ModusWcTypography>
        </div>

        <div slot="footer" className="paystub-confirm-actions">
          <ModusWcButton
            color="tertiary"
            variant="outlined"
            size="sm"
            onButtonClick={closePaystubConfirm}
          >
            Cancel
          </ModusWcButton>
          <ModusWcButton
            color="primary"
            variant="filled"
            size="sm"
            onButtonClick={confirmViewPaystub}
          >
            <ModusWcIcon name="download" size="xs" decorative />
            View Paystub
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </div>
  );
}
