import { useCallback, useMemo, useState } from 'react';
import {
  ModusWcAlert,
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

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface PaystubBreakdown {
  gross: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  net: number;
}

/** Derives a deterministic earnings breakdown from a check so a paystub is
 *  stable every time the same check is opened. */
function buildPaystub(check: CheckRecord): PaystubBreakdown {
  const seed = Number(check.checkNumber) || 0;
  const gross = 2500 + (seed % 4000);
  const federalTax = Math.round(gross * 0.12 * 100) / 100;
  const stateTax = Math.round(gross * 0.05 * 100) / 100;
  const socialSecurity = Math.round(gross * 0.062 * 100) / 100;
  const medicare = Math.round(gross * 0.0145 * 100) / 100;
  const net =
    Math.round((gross - federalTax - stateTax - socialSecurity - medicare) * 100) / 100;
  return { gross, federalTax, stateTax, socialSecurity, medicare, net };
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
  // The check whose paystub is currently open in the viewer modal.
  const [selectedCheck, setSelectedCheck] = useState<CheckRecord | null>(null);

  const PAYSTUB_MODAL_ID = 'paystub-viewer-dialog';

  const openPaystub = useCallback((check: CheckRecord) => {
    setSelectedCheck(check);
    const dialog = document.getElementById(
      PAYSTUB_MODAL_ID
    ) as HTMLDialogElement | null;
    dialog?.showModal();
  }, []);

  const closePaystub = useCallback(() => {
    const dialog = document.getElementById(
      PAYSTUB_MODAL_ID
    ) as HTMLDialogElement | null;
    dialog?.close();
  }, []);

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
            openPaystub(row as CheckRecord);
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
        header: 'Badges',
        accessor: 'payType',
        sortable: false,
        cellRenderer: (value) => renderBadges(String(value ?? '')),
      },
    ],
    [openPaystub]
  );

  const rows = result?.rows ?? [];
  const showResults = hasSearched && rows.length > 0;
  const showEmptyState = hasSearched && rows.length === 0;

  // The whole point of the audit: reconcile what payroll generated against what
  // actually landed in ESS. Any positive delta means paystubs are missing.
  const expected = result?.totalExpected ?? 0;
  const found = rows.length;
  const missing = Math.max(0, expected - found);
  const hasDiscrepancy = missing > 0;

  const selectedEmployeeName = selectedCheck
    ? EMPLOYEES.find((e) => e.code === selectedCheck.employeeCode)?.name ??
      selectedCheck.employeeCode
    : '';
  const paystub = selectedCheck ? buildPaystub(selectedCheck) : null;

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
            <ModusWcButton color="secondary" variant="outlined" type="button" onButtonClick={handleReset}>
              Clear
            </ModusWcButton>
            <ModusWcButton color="primary" type="submit" onButtonClick={handleRun}>
              Run Report
            </ModusWcButton>
          </div>
        </form>
      </ModusWcCard>

      {/* --- KPI summary cards --- */}
      {showResults && (
        <section className="kpi-grid" aria-label="Summary metrics">
          <ModusWcCard bordered padding="compact" customClass="kpi-card">
            <span slot="subtitle">Total Expected Checks</span>
            <ModusWcTypography hierarchy="h2" size="3xl" weight="bold">
              {String(expected)}
            </ModusWcTypography>
          </ModusWcCard>

          <ModusWcCard bordered padding="compact" customClass="kpi-card">
            <span slot="subtitle">Checks Found in ESS</span>
            <ModusWcTypography hierarchy="h2" size="3xl" weight="bold">
              {String(found)}
            </ModusWcTypography>
          </ModusWcCard>

          <ModusWcCard
            bordered
            padding="compact"
            customClass={`kpi-card ${hasDiscrepancy ? 'kpi-card--alert' : 'kpi-card--ok'}`}
          >
            <span slot="subtitle">Missing from ESS</span>
            <ModusWcTypography hierarchy="h2" size="3xl" weight="bold">
              {String(missing)}
            </ModusWcTypography>
          </ModusWcCard>
        </section>
      )}

      {/* --- Reconciliation diagnostic --- */}
      {showResults && hasDiscrepancy && (
        <ModusWcAlert
          customClass="audit-alert"
          variant="warning"
          role="alert"
          alertTitle={`${missing} of ${expected} expected pay stub${
            expected === 1 ? '' : 's'
          } not found in Employee Self-Service`}
          alertDescription="These checks were processed by payroll but have not appeared in the portal. This is typically caused by Kafka encryption errors or Spectrum data-transmission issues that prevent the paystub from loading into ESS. Affected employees will not be able to view these paystubs until they are re-transmitted."
        />
      )}

      {showResults && !hasDiscrepancy && (
        <ModusWcAlert
          customClass="audit-alert"
          variant="success"
          role="status"
          alertTitle="All expected pay stubs were received in Employee Self-Service"
          alertDescription="Every processed check for this criteria is available in the portal. Employees can view all of their paystubs — no transmission gaps detected."
        />
      )}

      {/* --- Results table --- */}
      {showResults && (
        <ModusWcCard bordered padding="comfortable" customClass="table-card">
          <span slot="title">Results</span>
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

      {/* --- Paystub viewer --- */}
      <ModusWcModal
        modalId={PAYSTUB_MODAL_ID}
        customClass="paystub-modal"
        position="center"
        aria-label="Paystub viewer"
      >
        <span slot="header">
          Paystub{selectedCheck ? ` — Check #${selectedCheck.checkNumber}` : ''}
        </span>

        <div slot="content" className="paystub">
          <div className="paystub-head">
            <div>
              <div className="paystub-company">
                {selectedCheck ? `${selectedCheck.companyCode} Payroll` : ''}
              </div>
              <div className="paystub-doc">Employee Pay Statement</div>
            </div>
            <div className="paystub-check">
              <div>
                <span className="paystub-k">Check #</span>
                <span className="paystub-v">{selectedCheck?.checkNumber ?? ''}</span>
              </div>
              <div>
                <span className="paystub-k">Check Date</span>
                <span className="paystub-v">{selectedCheck?.checkDate ?? ''}</span>
              </div>
            </div>
          </div>

          <dl className="paystub-meta">
            <div>
              <dt>Employee</dt>
              <dd>
                {selectedCheck
                  ? `${selectedEmployeeName} (${selectedCheck.employeeCode})`
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Company Code</dt>
              <dd>{selectedCheck?.companyCode ?? ''}</dd>
            </div>
            <div>
              <dt>Check Type</dt>
              <dd>{selectedCheck?.checkType ?? ''}</dd>
            </div>
            <div>
              <dt>Pay Type</dt>
              <dd>{selectedCheck?.payType ?? ''}</dd>
            </div>
          </dl>

          <table className="paystub-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="paystub-amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Earnings{selectedCheck ? ` (${selectedCheck.payType})` : ''}</td>
                <td className="paystub-amt">
                  {paystub ? currency.format(paystub.gross) : ''}
                </td>
              </tr>
              <tr>
                <td>Federal Income Tax</td>
                <td className="paystub-amt">
                  {paystub ? `-${currency.format(paystub.federalTax)}` : ''}
                </td>
              </tr>
              <tr>
                <td>State Income Tax</td>
                <td className="paystub-amt">
                  {paystub ? `-${currency.format(paystub.stateTax)}` : ''}
                </td>
              </tr>
              <tr>
                <td>Social Security</td>
                <td className="paystub-amt">
                  {paystub ? `-${currency.format(paystub.socialSecurity)}` : ''}
                </td>
              </tr>
              <tr>
                <td>Medicare</td>
                <td className="paystub-amt">
                  {paystub ? `-${currency.format(paystub.medicare)}` : ''}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Net Pay</td>
                <td className="paystub-amt">
                  {paystub ? currency.format(paystub.net) : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div slot="footer" className="paystub-actions">
          <ModusWcButton color="secondary" variant="outlined" onButtonClick={closePaystub}>
            Close
          </ModusWcButton>
          <ModusWcButton
            color="primary"
            onButtonClick={() =>
              console.log('Download PDF for check ' + selectedCheck?.checkNumber)
            }
          >
            <ModusWcIcon name="download" size="sm" decorative />
            Download PDF
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </div>
  );
}
