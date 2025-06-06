// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import webauthnPaneStyles from './webauthnPane.css.js';
const {render, html} = Lit;

const UIStrings = {
  /**
   *@description Label for button that allows user to download the private key related to a credential.
   */
  export: 'Export',
  /**
   *@description Label for an item to remove something
   */
  remove: 'Remove',
  /**
   *@description Label for empty credentials table.
   *@example {navigator.credentials.create()} PH1
   */
  noCredentialsTryCallingSFromYour: 'No credentials. Try calling {PH1} from your website.',
  /**
   *@description Label for checkbox to toggle the virtual authenticator environment allowing user to interact with software-based virtual authenticators.
   */
  enableVirtualAuthenticator: 'Enable virtual authenticator environment',
  /**
   *@description Label for ID field for credentials.
   */
  id: 'ID',
  /**
   *@description Label for field that describes whether a credential is a resident credential.
   */
  isResident: 'Is Resident',
  /**
   *@description Label for credential field that represents the Relying Party ID that the credential is scoped to.
   */
  rpId: 'RP ID',
  /**
   *@description Label for a column in a table. A field/unique ID that represents the user a credential is mapped to.
   */
  userHandle: 'User Handle',
  /**
   *@description Label for signature counter field for credentials which represents the number of successful assertions.
   * See https://w3c.github.io/webauthn/#signature-counter.
   */
  signCount: 'Signature Count',
  /**
   *@description Label for column with actions for credentials.
   */
  actions: 'Actions',
  /**
   *@description Title for the table that holds the credentials that a authenticator has registered.
   */
  credentials: 'Credentials',
  /**
   *@description Text that shows before the virtual environment is enabled.
   */
  noAuthenticator: 'No authenticator set up',
  /**
   *@description That that shows before virtual environment is enabled explaining the panel.
   */
  useWebauthnForPhishingresistant: 'Use WebAuthn for phishing-resistant authentication.',
  /**
   *@description Title for section of interface that allows user to add a new virtual authenticator.
   */
  newAuthenticator: 'New authenticator',
  /**
   *@description Text for security or network protocol
   */
  protocol: 'Protocol',
  /**
   *@description Label for input to select which transport option to use on virtual authenticators, e.g. USB or Bluetooth.
   */
  transport: 'Transport',
  /**
   *@description Label for checkbox that toggles resident key support on virtual authenticators.
   */
  supportsResidentKeys: 'Supports resident keys',
  /**
   *@description Label for checkbox that toggles large blob support on virtual authenticators. Large blobs are opaque data associated
   * with a WebAuthn credential that a website can store, like an SSH certificate or a symmetric encryption key.
   * See https://w3c.github.io/webauthn/#sctn-large-blob-extension
   */
  supportsLargeBlob: 'Supports large blob',
  /**
   *@description Text to add something
   */
  add: 'Add',
  /**
   *@description Label for button to add a new virtual authenticator.
   */
  addAuthenticator: 'Add authenticator',
  /**
   *@description Label for radio button that toggles whether an authenticator is active.
   */
  active: 'Active',
  /**
   *@description Title for button that enables user to customize name of authenticator.
   */
  editName: 'Edit name',
  /**
   *@description Placeholder for the input box to customize name of authenticator.
   */
  enterNewName: 'Enter new name',
  /**
   *@description Title for button that enables user to save name of authenticator after editing it.
   */
  saveName: 'Save name',
  /**
   *@description Title for a user-added virtual authenticator which is uniquely identified with its AUTHENTICATORID.
   *@example {8c7873be-0b13-4996-a794-1521331bbd96} PH1
   */
  authenticatorS: 'Authenticator {PH1}',
  /**
   *@description Name for generated file which user can download. A private key is a secret code which enables encoding and decoding of a credential. .pem is the file extension.
   */
  privateKeypem: 'Private key.pem',
  /**
   *@description Label for field that holds an authenticator's universally unique identifier (UUID).
   */
  uuid: 'UUID',
  /**
   *@description Label for checkbox that toggles user verification support on virtual authenticators.
   */
  supportsUserVerification: 'Supports user verification',
  /**
   *@description Text in Timeline indicating that input has happened recently
   */
  yes: 'Yes',
  /**
   *@description Text in Timeline indicating that input has not happened recently
   */
  no: 'No',
  /**
   *@description Title of radio button that sets an authenticator as active.
   *@example {Authenticator ABCDEF} PH1
   */
  setSAsTheActiveAuthenticator: 'Set {PH1} as the active authenticator',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/webauthn/WebauthnPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);

const WEB_AUTHN_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/webauthn' as Platform.DevToolsPath.UrlString;

class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  constructor(private readonly credential: Protocol.WebAuthn.Credential) {
    super(credential);
  }

  override nodeSelfHeight(): number {
    return 24;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    UI.Tooltip.Tooltip.install(cell, cell.textContent || '');

    if (columnId !== 'actions') {
      return cell;
    }

    const onExportCredential = (): void => {
      if (this.dataGrid) {
        (this.dataGrid as WebauthnDataGrid).onExportCredential(this.credential);
      }
    };
    const onRemoveCredential = (): void => {
      if (this.dataGrid) {
        (this.dataGrid as WebauthnDataGrid).onRemoveCredential(this.credential);
      }
    };
    // clang-format off
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(html`
       <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
           @click=${onExportCredential} .jslogContext=${'webauthn.export-credential'}>
        ${i18nString(UIStrings.export)}
      </devtools-button>
      <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
          @click=${onRemoveCredential} .jslogContext=${'webauthn.remove-credential'}>
        ${i18nString(UIStrings.remove)}
      </devtools-button>`, cell);
    // clang-format on

    return cell;
  }
}

class WebauthnDataGrid extends DataGrid.DataGrid.DataGridImpl<DataGridNode> {
  onExportCredential = (_: Protocol.WebAuthn.Credential): void => {};
  onRemoveCredential = (_: Protocol.WebAuthn.Credential): void => {};
}

class EmptyDataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  override createCells(element: Element): void {
    element.removeChildren();
    // clang-format off
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(html`
      <td class=${DataGrid.DataGrid.Align.CENTER} colspan=${this.dataGrid?.visibleColumnsArray.length ?? 1}>
        ${i18nTemplate(UIStrings.noCredentialsTryCallingSFromYour,
                       {PH1: html`<span class="code">navigator.credentials.create()</span>`})}
      </td>`, element as HTMLElement);
    // clang-format on
  }
}

type AvailableAuthenticatorOptions = Protocol.WebAuthn.VirtualAuthenticatorOptions&{
  active: boolean,
  authenticatorId: Protocol.WebAuthn.AuthenticatorId,
};

// We extrapolate this variable as otherwise git detects a private key, even though we
// perform string manipulation. If we extract the name, then the regex doesn't match
// and we can upload as expected.
const PRIVATE_NAME = 'PRIVATE';
const PRIVATE_KEY_HEADER = `-----BEGIN ${PRIVATE_NAME} KEY-----
`;
const PRIVATE_KEY_FOOTER = `-----END ${PRIVATE_NAME} KEY-----`;

const PROTOCOL_AUTHENTICATOR_VALUES: Protocol.EnumerableEnum<typeof Protocol.WebAuthn.AuthenticatorProtocol> = {
  Ctap2: Protocol.WebAuthn.AuthenticatorProtocol.Ctap2,
  U2f: Protocol.WebAuthn.AuthenticatorProtocol.U2f,
};

export class WebauthnPaneImpl extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.WebAuthnModel.WebAuthnModel> {
  #activeAuthId: Protocol.WebAuthn.AuthenticatorId|null = null;
  #hasBeenEnabled = false;
  readonly dataGrids = new Map<Protocol.WebAuthn.AuthenticatorId, DataGrid.DataGrid.DataGridImpl<DataGridNode>>();
  #enableCheckbox!: UI.Toolbar.ToolbarCheckbox;
  readonly #availableAuthenticatorSetting: Common.Settings.Setting<AvailableAuthenticatorOptions[]>;
  #model?: SDK.WebAuthnModel.WebAuthnModel;
  #authenticatorsView: HTMLElement;
  #topToolbarContainer: HTMLElement|undefined;
  #topToolbar: UI.Toolbar.Toolbar|undefined;
  #learnMoreView: UI.EmptyWidget.EmptyWidget|undefined;
  #newAuthenticatorSection: HTMLElement|undefined;
  #newAuthenticatorForm: HTMLElement|undefined;
  #protocolSelect: HTMLSelectElement|undefined;
  transportSelect: HTMLSelectElement|undefined;
  residentKeyCheckbox: HTMLInputElement|undefined;
  #userVerificationCheckbox: HTMLInputElement|undefined;
  largeBlobCheckbox: HTMLInputElement|undefined;
  addAuthenticatorButton: Buttons.Button.Button|undefined;
  #isEnabling?: Promise<void>;

  constructor() {
    super(true);
    this.registerRequiredCSS(webauthnPaneStyles);

    this.element.setAttribute('jslog', `${VisualLogging.panel('webauthn').track({resize: true})}`);

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebAuthnModel.WebAuthnModel, this, {scoped: true});

    this.contentElement.classList.add('webauthn-pane');

    this.#availableAuthenticatorSetting =
        Common.Settings.Settings.instance().createSetting<AvailableAuthenticatorOptions[]>(
            'webauthn-authenticators', []);

    this.#createToolbar();
    this.#authenticatorsView = this.contentElement.createChild('div', 'authenticators-view');
    this.#createNewAuthenticatorSection();
    this.#updateVisibility(false);
  }

  modelAdded(model: SDK.WebAuthnModel.WebAuthnModel): void {
    if (model.target() === model.target().outermostTarget()) {
      this.#model = model;
    }
  }

  modelRemoved(model: SDK.WebAuthnModel.WebAuthnModel): void {
    if (model.target() === model.target().outermostTarget()) {
      this.#model = undefined;
    }
  }

  async #loadInitialAuthenticators(): Promise<void> {
    let activeAuthenticatorId: Protocol.WebAuthn.AuthenticatorId|null = null;
    const availableAuthenticators = this.#availableAuthenticatorSetting.get();
    for (const options of availableAuthenticators) {
      if (!this.#model) {
        continue;
      }

      const authenticatorId = await this.#model.addAuthenticator(options);
      void this.#addAuthenticatorSection(authenticatorId, options);
      // Update the authenticatorIds in the options.
      options.authenticatorId = authenticatorId;
      if (options.active) {
        activeAuthenticatorId = authenticatorId;
      }
    }

    // Update the settings to reflect the new authenticatorIds.
    this.#availableAuthenticatorSetting.set(availableAuthenticators);
    if (activeAuthenticatorId) {
      void this.#setActiveAuthenticator(activeAuthenticatorId);
    }
  }

  override async ownerViewDisposed(): Promise<void> {
    if (this.#enableCheckbox) {
      this.#enableCheckbox.setChecked(false);
    }
    await this.#setVirtualAuthEnvEnabled(false);
  }

  #createToolbar(): void {
    this.#topToolbarContainer = this.contentElement.createChild('div', 'webauthn-toolbar-container');
    this.#topToolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    this.#topToolbarContainer.role = 'toolbar';
    this.#topToolbar = this.#topToolbarContainer.createChild('devtools-toolbar', 'webauthn-toolbar');
    this.#topToolbar.role = 'presentation';
    const enableCheckboxTitle = i18nString(UIStrings.enableVirtualAuthenticator);
    this.#enableCheckbox = new UI.Toolbar.ToolbarCheckbox(
        enableCheckboxTitle, enableCheckboxTitle, this.#handleCheckboxToggle.bind(this), 'virtual-authenticators');
    this.#topToolbar.appendToolbarItem(this.#enableCheckbox);
  }

  #createCredentialsDataGrid(authenticatorId: Protocol.WebAuthn.AuthenticatorId):
      DataGrid.DataGrid.DataGridImpl<DataGridNode> {
    const columns = ([
      {
        id: 'credentialId',
        title: i18nString(UIStrings.id),
        longText: true,
        weight: 24,
      },
      {
        id: 'isResidentCredential',
        title: i18nString(UIStrings.isResident),
        dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        weight: 10,
      },
      {
        id: 'rpId',
        title: i18nString(UIStrings.rpId),
      },
      {
        id: 'userHandle',
        title: i18nString(UIStrings.userHandle),
      },
      {
        id: 'signCount',
        title: i18nString(UIStrings.signCount),
      },
      {id: 'actions', title: i18nString(UIStrings.actions)},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    const dataGridConfig = {
      displayName: i18nString(UIStrings.credentials),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    };
    const dataGrid = new WebauthnDataGrid(dataGridConfig);
    dataGrid.renderInline();
    dataGrid.setStriped(true);
    dataGrid.onExportCredential = this.#exportCredential.bind(this);
    dataGrid.onRemoveCredential = ({credentialId}) => this.#removeCredential(authenticatorId, credentialId);
    dataGrid.rootNode().appendChild(new EmptyDataGridNode());

    this.dataGrids.set(authenticatorId, dataGrid);

    return dataGrid;
  }

  #addCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialAddedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const emptyNode = dataGrid.rootNode().children.find(node => !Object.keys(node.data).length);
    if (emptyNode) {
      dataGrid.rootNode().removeChild(emptyNode);
    }
    const node = new DataGridNode(event.credential);
    dataGrid.rootNode().appendChild(node);
  }

  #updateCredential(
      authenticatorId: Protocol.WebAuthn.AuthenticatorId,
      {
        data: event,
      }: Common.EventTarget
          .EventTargetEvent<Protocol.WebAuthn.CredentialAssertedEvent&Protocol.WebAuthn.CredentialUpdatedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const node = dataGrid.rootNode().children.find(node => node.data?.credentialId === event.credential.credentialId);
    if (!node) {
      return;
    }
    node.data = event.credential;
  }

  #deleteCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialDeletedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const node = dataGrid.rootNode().children.find(node => node.data?.credentialId === event.credentialId);
    if (!node) {
      return;
    }
    node.remove();
  }

  async #setVirtualAuthEnvEnabled(enable: boolean): Promise<void> {
    await this.#isEnabling;
    this.#isEnabling = new Promise<void>(async (resolve: (value: void) => void) => {
      if (enable && !this.#hasBeenEnabled) {
        // Ensures metric is only tracked once per session.
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.VirtualAuthenticatorEnvironmentEnabled);
        this.#hasBeenEnabled = true;
      }
      if (this.#model) {
        await this.#model.setVirtualAuthEnvEnabled(enable);
      }

      if (enable) {
        await this.#loadInitialAuthenticators();
      } else {
        this.#removeAuthenticatorSections();
      }

      this.#updateVisibility(enable);
      this.#isEnabling = undefined;
      resolve();
    });
  }

  #updateVisibility(enabled: boolean): void {
    this.contentElement.classList.toggle('enabled', enabled);
  }

  #removeAuthenticatorSections(): void {
    this.#authenticatorsView.innerHTML = '';
    for (const dataGrid of this.dataGrids.values()) {
      dataGrid.asWidget().detach();
    }
    this.dataGrids.clear();
  }

  #handleCheckboxToggle(e: MouseEvent): void {
    void this.#setVirtualAuthEnvEnabled((e.target as HTMLInputElement).checked);
  }

  #updateEnabledTransportOptions(enabledOptions: Protocol.WebAuthn.AuthenticatorTransport[]): void {
    if (!this.transportSelect) {
      return;
    }

    const prevValue = this.transportSelect.value;
    this.transportSelect.removeChildren();

    for (const option of enabledOptions) {
      this.transportSelect.appendChild(UI.UIUtils.createOption(option, option, option));
    }

    // Make sure the currently selected value stays the same.
    this.transportSelect.value = prevValue;
    // If the new set does not include the previous value.
    if (!this.transportSelect.value) {
      // Select the first available value.
      this.transportSelect.selectedIndex = 0;
    }
    this.#updateInternalTransportAvailability();
  }

  #updateInternalTransportAvailability(): void {
    if (!this.transportSelect?.options) {
      return;
    }
    const hasInternal = Boolean(this.#availableAuthenticatorSetting.get().find(
        authenticator => authenticator.transport === Protocol.WebAuthn.AuthenticatorTransport.Internal));
    for (let i = 0; i < this.transportSelect.options.length; ++i) {
      const option = this.transportSelect.options[i];
      if (option.value === Protocol.WebAuthn.AuthenticatorTransport.Internal) {
        option.disabled = hasInternal;
        // This relies on "internal" never being the first or only element.
        if (i === this.transportSelect.selectedIndex) {
          --this.transportSelect.selectedIndex;
        }
        break;
      }
    }
  }

  #updateNewAuthenticatorSectionOptions(): void {
    if (!this.#protocolSelect || !this.residentKeyCheckbox || !this.#userVerificationCheckbox ||
        !this.largeBlobCheckbox) {
      return;
    }

    if (this.#protocolSelect.value === Protocol.WebAuthn.AuthenticatorProtocol.Ctap2) {
      this.residentKeyCheckbox.disabled = false;
      this.#userVerificationCheckbox.disabled = false;
      this.largeBlobCheckbox.disabled = !this.residentKeyCheckbox.checked;
      if (this.largeBlobCheckbox.disabled) {
        this.largeBlobCheckbox.checked = false;
      }
      this.#updateEnabledTransportOptions([
        Protocol.WebAuthn.AuthenticatorTransport.Usb,
        Protocol.WebAuthn.AuthenticatorTransport.Ble,
        Protocol.WebAuthn.AuthenticatorTransport.Nfc,
        Protocol.WebAuthn.AuthenticatorTransport.Internal,
      ]);
    } else {
      this.residentKeyCheckbox.checked = false;
      this.residentKeyCheckbox.disabled = true;
      this.#userVerificationCheckbox.checked = false;
      this.#userVerificationCheckbox.disabled = true;
      this.largeBlobCheckbox.checked = false;
      this.largeBlobCheckbox.disabled = true;
      this.#updateEnabledTransportOptions([
        Protocol.WebAuthn.AuthenticatorTransport.Usb,
        Protocol.WebAuthn.AuthenticatorTransport.Ble,
        Protocol.WebAuthn.AuthenticatorTransport.Nfc,
      ]);
    }
  }

  #createNewAuthenticatorSection(): void {
    this.#learnMoreView = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noAuthenticator), i18nString(UIStrings.useWebauthnForPhishingresistant));
    this.#learnMoreView.element.classList.add('learn-more');
    this.#learnMoreView.link = WEB_AUTHN_EXPLANATION_URL;
    this.#learnMoreView.show(this.contentElement);

    this.#newAuthenticatorSection = this.contentElement.createChild('div', 'new-authenticator-container');
    const newAuthenticatorTitle =
        UI.UIUtils.createLabel(i18nString(UIStrings.newAuthenticator), 'new-authenticator-title');
    this.#newAuthenticatorSection.appendChild(newAuthenticatorTitle);
    this.#newAuthenticatorForm = this.#newAuthenticatorSection.createChild('div', 'new-authenticator-form');
    this.#newAuthenticatorForm.setAttribute('jslog', `${VisualLogging.section('new-authenticator')}`);

    const protocolGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');
    const transportGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');
    const residentKeyGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');
    const userVerificationGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');
    const largeBlobGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');
    const addButtonGroup = this.#newAuthenticatorForm.createChild('div', 'authenticator-option');

    const protocolSelectTitle = UI.UIUtils.createLabel(i18nString(UIStrings.protocol), 'authenticator-option-label');
    protocolGroup.appendChild(protocolSelectTitle);
    this.#protocolSelect = protocolGroup.createChild('select');
    this.#protocolSelect.setAttribute('jslog', `${VisualLogging.dropDown('protocol').track({change: true})}`);
    UI.ARIAUtils.bindLabelToControl(protocolSelectTitle, (this.#protocolSelect as Element));
    Object.values(PROTOCOL_AUTHENTICATOR_VALUES).sort().forEach((option: Protocol.WebAuthn.AuthenticatorProtocol) => {
      if (this.#protocolSelect) {
        this.#protocolSelect.appendChild(UI.UIUtils.createOption(option, option, option));
      }
    });

    if (this.#protocolSelect) {
      this.#protocolSelect.value = Protocol.WebAuthn.AuthenticatorProtocol.Ctap2;
    }

    const transportSelectTitle = UI.UIUtils.createLabel(i18nString(UIStrings.transport), 'authenticator-option-label');
    transportGroup.appendChild(transportSelectTitle);
    this.transportSelect = transportGroup.createChild('select');
    this.transportSelect.setAttribute('jslog', `${VisualLogging.dropDown('transport').track({change: true})}`);
    UI.ARIAUtils.bindLabelToControl(transportSelectTitle, (this.transportSelect as Element));
    // transportSelect will be populated in updateNewAuthenticatorSectionOptions.

    const residentKeyCheckboxLabel =
        UI.UIUtils.createLabel(i18nString(UIStrings.supportsResidentKeys), 'authenticator-option-label');
    residentKeyCheckboxLabel.setAttribute('jslog', `${VisualLogging.toggle('resident-key').track({change: true})}`);
    residentKeyGroup.appendChild(residentKeyCheckboxLabel);
    this.residentKeyCheckbox = residentKeyGroup.createChild('input', 'authenticator-option-checkbox');
    this.residentKeyCheckbox.type = 'checkbox';
    this.residentKeyCheckbox.checked = false;
    UI.ARIAUtils.bindLabelToControl(residentKeyCheckboxLabel, this.residentKeyCheckbox);

    const userVerificationCheckboxLabel =
        UI.UIUtils.createLabel(i18nString(UIStrings.supportsUserVerification), 'authenticator-option-label');
    userVerificationCheckboxLabel.setAttribute(
        'jslog', `${VisualLogging.toggle('user-verification').track({change: true})}`);
    userVerificationGroup.appendChild(userVerificationCheckboxLabel);
    this.#userVerificationCheckbox = userVerificationGroup.createChild('input', 'authenticator-option-checkbox');
    this.#userVerificationCheckbox.type = 'checkbox';
    this.#userVerificationCheckbox.checked = false;
    UI.ARIAUtils.bindLabelToControl(userVerificationCheckboxLabel, this.#userVerificationCheckbox);

    const largeBlobCheckboxLabel =
        UI.UIUtils.createLabel(i18nString(UIStrings.supportsLargeBlob), 'authenticator-option-label');
    largeBlobCheckboxLabel.setAttribute('jslog', `${VisualLogging.toggle('large-blob').track({change: true})}`);
    largeBlobGroup.appendChild(largeBlobCheckboxLabel);
    this.largeBlobCheckbox = largeBlobGroup.createChild('input', 'authenticator-option-checkbox');
    this.largeBlobCheckbox.type = 'checkbox';
    this.largeBlobCheckbox.checked = false;
    UI.ARIAUtils.bindLabelToControl(largeBlobCheckboxLabel, this.largeBlobCheckbox);

    this.addAuthenticatorButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.add), this.#handleAddAuthenticatorButton.bind(this),
        {jslogContext: 'webauthn.add-authenticator'});
    addButtonGroup.createChild('div', 'authenticator-option-label');
    addButtonGroup.appendChild(this.addAuthenticatorButton);
    const addAuthenticatorTitle = UI.UIUtils.createLabel(i18nString(UIStrings.addAuthenticator), '');
    UI.ARIAUtils.bindLabelToControl(addAuthenticatorTitle, this.addAuthenticatorButton);

    this.#updateNewAuthenticatorSectionOptions();
    if (this.#protocolSelect) {
      this.#protocolSelect.addEventListener('change', this.#updateNewAuthenticatorSectionOptions.bind(this));
    }
    if (this.residentKeyCheckbox) {
      this.residentKeyCheckbox.addEventListener('change', this.#updateNewAuthenticatorSectionOptions.bind(this));
    }
  }

  async #handleAddAuthenticatorButton(): Promise<void> {
    const options = this.#createOptionsFromCurrentInputs();
    if (this.#model) {
      const authenticatorId = await this.#model.addAuthenticator(options);
      const availableAuthenticators = this.#availableAuthenticatorSetting.get();
      availableAuthenticators.push({authenticatorId, active: true, ...options});
      this.#availableAuthenticatorSetting.set(
          availableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId})));
      const section = await this.#addAuthenticatorSection(authenticatorId, options);
      const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
      const prefersReducedMotion = mediaQueryList.matches;
      section.scrollIntoView({block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth'});
      this.#updateInternalTransportAvailability();
    }
  }

  async #addAuthenticatorSection(
      authenticatorId: Protocol.WebAuthn.AuthenticatorId,
      options: Protocol.WebAuthn.VirtualAuthenticatorOptions): Promise<HTMLDivElement> {
    const section = document.createElement('div');
    section.classList.add('authenticator-section');
    section.setAttribute('data-authenticator-id', authenticatorId);
    section.setAttribute('jslog', `${VisualLogging.section('authenticator')}`);
    this.#authenticatorsView.appendChild(section);

    const headerElement = section.createChild('div', 'authenticator-section-header');
    const titleElement = headerElement.createChild('div', 'authenticator-section-title');
    UI.ARIAUtils.markAsHeading(titleElement, 2);

    await this.#clearActiveAuthenticator();
    const activeButtonContainer = headerElement.createChild('div', 'active-button-container');
    const {label: activeLabel, radio: activeRadio} = UI.UIUtils.createRadioButton(
        'active-authenticator', i18nString(UIStrings.active), 'webauthn.active-authenticator');
    activeRadio.addEventListener('change', this.#setActiveAuthenticator.bind(this, authenticatorId));
    activeRadio.checked = true;
    activeButtonContainer.appendChild(activeLabel);
    this.#activeAuthId = authenticatorId;  // Newly added authenticator is automatically set as active.

    const removeButton = headerElement.createChild('button', 'text-button');
    removeButton.textContent = i18nString(UIStrings.remove);
    removeButton.addEventListener('click', this.removeAuthenticator.bind(this, authenticatorId));
    removeButton.setAttribute('jslog', `${VisualLogging.action('webauthn.remove-authenticator').track({click: true})}`);

    const toolbar = titleElement.createChild('devtools-toolbar', 'edit-name-toolbar');
    const editName = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.editName), 'edit', undefined, 'edit-name');
    const saveName = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveName), 'checkmark', undefined, 'save-name');
    saveName.setVisible(false);

    const nameField = titleElement.createChild('input', 'authenticator-name-field');
    nameField.placeholder = i18nString(UIStrings.enterNewName);
    nameField.disabled = true;
    nameField.setAttribute('jslog', `${VisualLogging.textField('name').track({keydown: 'Enter', change: true})}`);
    const userFriendlyName = authenticatorId.slice(-5);  // User friendly name defaults to last 5 chars of UUID.
    nameField.value = i18nString(UIStrings.authenticatorS, {PH1: userFriendlyName});
    this.#updateActiveLabelTitle(activeLabel, nameField.value);

    editName.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK,
        () => this.#handleEditNameButton(titleElement, nameField, editName, saveName));
    saveName.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK,
        () => this.#handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel));

    nameField.addEventListener(
        'focusout', () => this.#handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel));
    nameField.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.#handleSaveNameButton(titleElement, nameField, editName, saveName, activeLabel);
      }
    });

    toolbar.appendToolbarItem(editName);
    toolbar.appendToolbarItem(saveName);

    this.#createAuthenticatorFields(section, authenticatorId, options);

    const label = document.createElement('div');
    label.classList.add('credentials-title');
    label.textContent = i18nString(UIStrings.credentials);
    section.appendChild(label);

    const dataGrid = this.#createCredentialsDataGrid(authenticatorId);
    dataGrid.asWidget().show(section);
    if (this.#model) {
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, this.#addCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_ASSERTED, this.#updateCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_UPDATED, this.#updateCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, this.#deleteCredential.bind(this, authenticatorId));
    }
    section.createChild('div', 'divider');

    return section;
  }

  #exportCredential(credential: Protocol.WebAuthn.Credential): void {
    let pem = PRIVATE_KEY_HEADER;
    for (let i = 0; i < credential.privateKey.length; i += 64) {
      pem += credential.privateKey.substring(i, i + 64) + '\n';
    }
    pem += PRIVATE_KEY_FOOTER;

    const link = document.createElement('a');
    link.download = i18nString(UIStrings.privateKeypem);
    link.href = 'data:application/x-pem-file,' + encodeURIComponent(pem);
    link.click();
  }

  #removeCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, credentialId: string): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }

    // @ts-expect-error dataGrid node type is indeterminate.
    dataGrid.rootNode()
        .children.find((n: DataGrid.DataGrid.DataGridNode<DataGridNode>) => n.data.credentialId === credentialId)
        .remove();

    if (!dataGrid.rootNode().children.length) {
      dataGrid.rootNode().appendChild(new EmptyDataGridNode());
    }

    if (this.#model) {
      void this.#model.removeCredential(authenticatorId, credentialId);
    }
  }

  /**
   * Creates the fields describing the authenticator in the front end.
   */
  #createAuthenticatorFields(
      section: Element, authenticatorId: string, options: Protocol.WebAuthn.VirtualAuthenticatorOptions): void {
    const sectionFields = section.createChild('div', 'authenticator-fields');
    const uuidField = sectionFields.createChild('div', 'authenticator-field');
    const protocolField = sectionFields.createChild('div', 'authenticator-field');
    const transportField = sectionFields.createChild('div', 'authenticator-field');
    const srkField = sectionFields.createChild('div', 'authenticator-field');
    const slbField = sectionFields.createChild('div', 'authenticator-field');
    const suvField = sectionFields.createChild('div', 'authenticator-field');

    uuidField.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.uuid), 'authenticator-option-label'));
    protocolField.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.protocol), 'authenticator-option-label'));
    transportField.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.transport), 'authenticator-option-label'));
    srkField.appendChild(
        UI.UIUtils.createLabel(i18nString(UIStrings.supportsResidentKeys), 'authenticator-option-label'));
    slbField.appendChild(UI.UIUtils.createLabel(i18nString(UIStrings.supportsLargeBlob), 'authenticator-option-label'));
    suvField.appendChild(
        UI.UIUtils.createLabel(i18nString(UIStrings.supportsUserVerification), 'authenticator-option-label'));

    uuidField.createChild('div', 'authenticator-field-value').textContent = authenticatorId;
    protocolField.createChild('div', 'authenticator-field-value').textContent = options.protocol;
    transportField.createChild('div', 'authenticator-field-value').textContent = options.transport;
    srkField.createChild('div', 'authenticator-field-value').textContent =
        options.hasResidentKey ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);
    slbField.createChild('div', 'authenticator-field-value').textContent =
        options.hasLargeBlob ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);
    suvField.createChild('div', 'authenticator-field-value').textContent =
        options.hasUserVerification ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);
  }

  #handleEditNameButton(
      titleElement: Element, nameField: HTMLInputElement, editName: UI.Toolbar.ToolbarButton,
      saveName: UI.Toolbar.ToolbarButton): void {
    nameField.disabled = false;
    titleElement.classList.add('editing-name');
    nameField.focus();
    saveName.setVisible(true);
    editName.setVisible(false);
  }

  #handleSaveNameButton(
      titleElement: Element, nameField: HTMLInputElement, editName: UI.Toolbar.ToolbarItem,
      saveName: UI.Toolbar.ToolbarItem, activeLabel: HTMLLabelElement): void {
    const name = nameField.value;
    if (!name) {
      return;
    }
    nameField.disabled = true;
    titleElement.classList.remove('editing-name');
    editName.setVisible(true);
    saveName.setVisible(false);
    this.#updateActiveLabelTitle(activeLabel, name);
  }

  #updateActiveLabelTitle(activeLabel: HTMLLabelElement, authenticatorName: string): void {
    UI.Tooltip.Tooltip.install(
        activeLabel, i18nString(UIStrings.setSAsTheActiveAuthenticator, {PH1: authenticatorName}));
  }

  /**
   * Removes both the authenticator and its respective UI element.
   */
  removeAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): void {
    if (this.#authenticatorsView) {
      const child = this.#authenticatorsView.querySelector(`[data-authenticator-id=${CSS.escape(authenticatorId)}]`);
      if (child) {
        child.remove();
      }
    }
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (dataGrid) {
      dataGrid.asWidget().detach();
      this.dataGrids.delete(authenticatorId);
    }

    if (this.#model) {
      void this.#model.removeAuthenticator(authenticatorId);
    }

    // Update available authenticator setting.
    const prevAvailableAuthenticators = this.#availableAuthenticatorSetting.get();
    const newAvailableAuthenticators = prevAvailableAuthenticators.filter(a => a.authenticatorId !== authenticatorId);
    this.#availableAuthenticatorSetting.set(newAvailableAuthenticators);

    if (this.#activeAuthId === authenticatorId) {
      const availableAuthenticatorIds = Array.from(this.dataGrids.keys());
      if (availableAuthenticatorIds.length) {
        void this.#setActiveAuthenticator(availableAuthenticatorIds[0]);
      } else {
        this.#activeAuthId = null;
      }
    }
    this.#updateInternalTransportAvailability();
  }

  #createOptionsFromCurrentInputs(): Protocol.WebAuthn.VirtualAuthenticatorOptions {
    // TODO(crbug.com/1034663): Add optionality for isUserVerified param.
    if (!this.#protocolSelect || !this.transportSelect || !this.residentKeyCheckbox ||
        !this.#userVerificationCheckbox || !this.largeBlobCheckbox) {
      throw new Error('Unable to create options from current inputs');
    }

    return {
      protocol: this.#protocolSelect.options[this.#protocolSelect.selectedIndex].value as
          Protocol.WebAuthn.AuthenticatorProtocol,
      ctap2Version: Protocol.WebAuthn.Ctap2Version.Ctap2_1,
      transport: this.transportSelect.options[this.transportSelect.selectedIndex].value as
          Protocol.WebAuthn.AuthenticatorTransport,
      hasResidentKey: this.residentKeyCheckbox.checked,
      hasUserVerification: this.#userVerificationCheckbox.checked,
      hasLargeBlob: this.largeBlobCheckbox.checked,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    };
  }

  /**
   * Sets the given authenticator as active.
   * Note that a newly added authenticator will automatically be set as active.
   */
  async #setActiveAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): Promise<void> {
    await this.#clearActiveAuthenticator();
    if (this.#model) {
      await this.#model.setAutomaticPresenceSimulation(authenticatorId, true);
    }
    this.#activeAuthId = authenticatorId;

    const prevAvailableAuthenticators = this.#availableAuthenticatorSetting.get();
    const newAvailableAuthenticators =
        prevAvailableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId}));
    this.#availableAuthenticatorSetting.set(newAvailableAuthenticators);

    this.#updateActiveButtons();
  }

  #updateActiveButtons(): void {
    const authenticators = this.#authenticatorsView.getElementsByClassName('authenticator-section');
    Array.from(authenticators).forEach((authenticator: Element) => {
      const button = (authenticator.querySelector('input[type="radio"]') as HTMLInputElement);
      if (!button) {
        return;
      }
      button.checked = (authenticator as HTMLElement).dataset.authenticatorId === this.#activeAuthId;
    });
  }

  async #clearActiveAuthenticator(): Promise<void> {
    if (this.#activeAuthId && this.#model) {
      await this.#model.setAutomaticPresenceSimulation(this.#activeAuthId, false);
    }
    this.#activeAuthId = null;
    this.#updateActiveButtons();
  }
}
