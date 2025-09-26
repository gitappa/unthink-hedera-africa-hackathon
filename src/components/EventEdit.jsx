import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Input,
  Typography,
  Row,
  Col,
  Button,
  Space,
  Modal,
  Select,
  message,
  Switch,
  Upload,
  Radio,
  Form,
  Collapse,
} from "antd";
import {
  PlusOutlined,
  CloseOutlined,
  MenuOutlined,
  UploadOutlined,
  LoadingOutlined,
  MinusOutlined,
  DownOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./EventEdit.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

const CURRENCY_OPTIONS = ["USD", "INR", "HBAR"];
const ACTION_OPTIONS = ["next", "skip", "download", "upload"];
const ACTION_TYPE_OPTIONS = ["button", "anchor link", "page link"];
const PROTECTED_FIELDS = ["Welcome Note", "Welcome Banner", "email", "full name"];

const SortableItem = ({ id, disabled, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: disabled ? 'default' : 'move'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      {children({ dragHandle: !disabled ? listeners : undefined })}
    </div>
  );
};

const labelToKey = (label) => {
  return label.toLowerCase().replace(/\s+/g, "_");
};

const generateUniqueKey = (label, existingKeys) => {
  let baseKey = labelToKey(label);
  let candidateKey = baseKey;
  let counter = 1;

  while (existingKeys.includes(candidateKey)) {
    candidateKey = `${baseKey}_${counter}`;
    counter++;
  }

  return candidateKey;
};

const EventEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(location.state?.eventData || {});
  const [selectedFeatureDetail, setSelectedFeatureDetail] = useState(null);
  const [combinedFields, setCombinedFields] = useState([]);
  const [nextActionField, setNextActionField] = useState({ value: [], action: [], section: [] });
  const [groupCategories, setGroupCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [sectionDetails, setSectionDetails] = useState({});
  const [newSectionInputs, setNewSectionInputs] = useState({});
  const [expandedFields, setExpandedFields] = useState({});
  const [newGroupCategory, setNewGroupCategory] = useState("");
  const [groupSelectOpen, setGroupSelectOpen] = useState(false);
  const [availableActions, setAvailableActions] = useState(ACTION_OPTIONS);
  const [newActionInputs, setNewActionInputs] = useState({});
  const [filterGroup, setFilterGroup] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const allSections = useMemo(() => {
    const sections = new Set();
    Object.values(sectionDetails).forEach(groupSections => {
      groupSections.forEach(section => sections.add(section));
    });
    return Array.from(sections);
  }, [sectionDetails]);

  const isProtectedField = (field) => {
    return PROTECTED_FIELDS.includes(field.label);
  };

  useEffect(() => {
    if (eventData && Object.keys(eventData).length > 0) {
      setSelectedFeatureDetail(eventData);

      if (eventData.group_category) {
        setGroupCategories(eventData.group_category);
      }

      if (eventData.section_details) {
        setSectionDetails(eventData.section_details);
      }

      processAdminDetails(eventData.admin_details);
    }
  }, [eventData]);

  const processAdminDetails = (adminDetails = []) => {
    const normal = [];
    const special = [];
    let nextAction = { value: [], action: [], section: [] };
    const initialExpandedFields = {};

    adminDetails.forEach((field) => {
      if (field.group && !Array.isArray(field.group)) {
        field.group = [field.group];
      }
      if (field.section && !Array.isArray(field.section)) {
        field.section = field.section ? [field.section] : [];
      }

      initialExpandedFields[field.key] = false;

      if (field.key === "next_action") {
        nextAction = {
          ...field,
          value: field.value || [],
          action: field.action || [],
          section: field.section || []
        };
      } else if (field.type === "object") {
        special.push(field);
      } else {
        field.showResponseMessage = field.response_message !== undefined;
        field.showActions = field.action !== undefined;
        field.showActionTypes = field.action_type !== undefined;
        normal.push(field);
      }
    });

    setExpandedFields(initialExpandedFields);
    setCombinedFields([...normal, ...special]);
    setNextActionField(nextAction);
  };

  const toggleFieldExpansion = (fieldKey) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file[]', file);

    try {
      const response = await axios.post(
        'https://auraprod.unthink.ai/cs/img/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      message.error('Image upload failed');
      throw error;
    }
  };

  const uploadVideo = async (file) => {
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post(
        'https://auraprod.unthink.ai/cs/audio/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response?.data;
    } catch (error) {
      message.error('Video upload failed');
      throw error;
    }
  };

  const handleFileUpload = async (file, fieldKey, fieldType) => {
    setUploadingField(fieldKey);

    try {
      let response;
      if (fieldType === "image") {
        response = await uploadImage(file);
      } else if (fieldType === "video") {
        response = await uploadVideo(file);
      } else if (fieldType === "audio") {
        response = await uploadAudio(file); // You might need to implement this
      } else {
        response = { data: [{ url: URL.createObjectURL(file) }] };
      }

      const updatedFields = combinedFields.map(field => {
        if (field.key === fieldKey) {
          return {
            ...field,
            messageAttachment: response.data[0].url,
            messageAttachmentType: file.type,
            ...(fieldType === "image" && { thumbnail: response?.data[0]?.thumbnail || response?.data[0]?.url })
          };
        }
        return field;
      });

      setCombinedFields(updatedFields);
      message.success(`File uploaded successfully!`);
    } catch (error) {
      message.error(`File upload failed`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleDeleteGroup = (groupToDelete, e) => {
    e.stopPropagation();
    const updatedGroups = groupCategories.filter((g) => g !== groupToDelete);
    setGroupCategories(updatedGroups);

    const updatedSectionDetails = { ...sectionDetails };
    delete updatedSectionDetails[groupToDelete];
    setSectionDetails(updatedSectionDetails);

    if (nextActionField?.group === groupToDelete) {
      setNextActionField((prev) => ({ ...prev, group: undefined }));
    }
    setGroupSelectOpen(false);
  };

  const handleDeleteAction = (actionKey) => {
    setNextActionField((prev) => ({
      ...prev,
      value: prev.value.filter((v) => v !== actionKey),
      action: prev.action.filter((a) => a.key !== actionKey),
    }));
  };

  const handleActionGroupChange = (actionKey, newGroup) => {
    setNextActionField((prev) => ({
      ...prev,
      action: prev.action.map((a) =>
        a.key === actionKey ? { ...a, group: newGroup } : a
      ),
    }));
  };

  const handleActionSectionChange = (actionKey, newSections) => {
    setNextActionField((prev) => ({
      ...prev,
      action: prev.action.map((a) =>
        a.key === actionKey ? { ...a, section: newSections } : a
      ),
    }));
  };

  const handleRemoveSection = (fieldKey, sectionName) => {
    const field = combinedFields.find(f => f.key === fieldKey);
    if (!field) return;

    let updatedField = { ...field };
    if (sectionName === 'responseMessage') {
      updatedField.showResponseMessage = false;
    } else if (sectionName === 'actions') {
      updatedField.showActions = false;
    } else if (sectionName === 'actionTypes') {
      updatedField.showActionTypes = false;
    }

    handleFieldChange(fieldKey, updatedField);
  };

  const addSectionToGroup = (group) => {
    const section = newSectionInputs[group]?.trim();
    if (section) {
      setSectionDetails(prev => ({
        ...prev,
        [group]: [...(prev[group] || []), section]
      }));
      setNewSectionInputs(prev => ({ ...prev, [group]: '' }));
    }
  };

  const handleNextActionChange = (selectedActions) => {
    setNextActionField((prev) => {
      const currentActions = [...(prev.action || [])];

      selectedActions.forEach((key) => {
        if (!currentActions.some((a) => a.key === key)) {
          currentActions.push({ key, position: "last" });
        }
      });

      const filteredActions = currentActions.filter((action) =>
        selectedActions.includes(action.key)
      );

      return {
        ...prev,
        value: selectedActions,
        action: filteredActions,
      };
    });
  };

  const handleSubmit = async () => {
    if (!selectedFeatureDetail) return;

    setIsSaving(true);

    try {
      const keyMap = {};
      const fieldsToUpdate = [];

      combinedFields.forEach(field => {
        if (field.__isNew && field.label) {
          const existingKeys = combinedFields
            .filter(f => !f.__isNew)
            .map(f => f.key);
          const newKey = generateUniqueKey(field.label, existingKeys);
          keyMap[field.key] = newKey;
          fieldsToUpdate.push({
            oldKey: field.key,
            newKey,
            field: { ...field, key: newKey }
          });
        }
      });

      const updatedCombinedFields = combinedFields.map(field => {
        const updatedField = fieldsToUpdate.find(f => f.oldKey === field.key);
        return updatedField ? updatedField.field : field;
      });

      // Update nextActionField with new keys
      let updatedNextActionField = {
        ...nextActionField,
        value: nextActionField.value.map(key => keyMap[key] || key),
        action: nextActionField.action.map(action => ({
          ...action,
          key: keyMap[action.key] || action.key
        })),
        section: nextActionField.section || []
      };

      // Create payload with next_action field included
      const payload = {
        admin_details: [
          ...updatedCombinedFields.map((field) => {
            let cleanedField = { ...field };

            if (field.key === "next_action") {
              return {
                ...cleanedField,
                value: updatedNextActionField.value || [],
                action: updatedNextActionField.action || [],
                section: updatedNextActionField.section || []
              };
            }

            if (field.is_user_input === false) {
              delete cleanedField.response_message;
              delete cleanedField.action;
              delete cleanedField.action_type;
            } else {
              if (field.showResponseMessage === false) delete cleanedField.response_message;
              if (field.showActions === false) delete cleanedField.action;
              if (field.showActionTypes === false) delete cleanedField.action_type;
            }

            delete cleanedField.showResponseMessage;
            delete cleanedField.showActions;
            delete cleanedField.showActionTypes;
            delete cleanedField.__isNew;
            delete cleanedField.thumbnail

            if (field.group && Array.isArray(field.group) && field.group.length === 1) {
              cleanedField.group = field.group[0];
            }

            return cleanedField;
          }),
          // Add next_action field if it doesn't exist
          ...(updatedCombinedFields.some(f => f.key === "next_action") ? [] : [{
            key: "next_action",
            label: "next action",
            type: "multi-select",
            is_display: true,
            is_user_input: false,
            mandatory: false,
            value: updatedNextActionField.value || [],
            action: updatedNextActionField.action || [],
            // section: updatedNextActionField.section || [],
          }])
        ],
        section_details: sectionDetails,
        group_category: groupCategories,
        current_group: updatedNextActionField?.group,
      };

      console.log("Final payload:", payload);

      const response = await axios.put(
        `https://auraprod.unthink.ai/agent_collection/update/service_id/${eventData.service_id}`,
        payload
      );

      if (response.data.status === "success") {
        message.success("Event updated successfully!");
        navigate(-1);
      } else {
        message.error("Failed to update event: " + response.data.message);
      }
    } catch (error) {
      message.error("Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key, newField) => {
    const normalizedField = {
      ...newField,
      group: Array.isArray(newField.group) ? newField.group :
        (newField.group ? [newField.group] : [])
    };

    setCombinedFields((prev) =>
      prev.map((f) => (f.key === key ? normalizedField : f))
    );

    setSelectedFeatureDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        admin_details: prev.admin_details.map((field) => {
          if (field.key === key) {
            return {
              ...field,
              ...normalizedField,
              is_display: field.is_display !== undefined ? field.is_display : true,
              is_user_input: normalizedField.is_user_input !== undefined
                ? normalizedField.is_user_input
                : field.is_user_input,
              mandatory: normalizedField.mandatory !== undefined
                ? normalizedField.mandatory
                : field.mandatory,
            };
          }
          return field;
        }),
      };
    });
  };

  const removeField = (key) => {
    setCombinedFields((prev) => prev.filter((f) => f.key !== key));

    setSelectedFeatureDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        admin_details: prev.admin_details.filter((field) => field.key !== key),
      };
    });
  };

  const addGroupCategory = () => {
    const trimmed = newGroupCategory.trim();
    if (trimmed && !groupCategories.includes(trimmed)) {
      setGroupCategories([...groupCategories, trimmed]);
      setSectionDetails(prev => ({
        ...prev,
        [trimmed]: []
      }));
      setNewGroupCategory("");
    }
  };

  const addNewField = () => {
    const existingKeys = combinedFields.map(f => f.key);
    const tempKey = `new_field_${Date.now()}`;

    const newField = {
      key: tempKey,
      label: "",
      type: "text",
      message: "",
      response_message: "",
      action: [],
      action_type: [],
      is_display: true,
      is_user_input: true,
      mandatory: false,
      __isNew: true,
      showResponseMessage: true,
      showActions: true,
      showActionTypes: true,
      group: groupCategories.length > 0 ? [filterGroup] : [],
      section: []
    };

    setCombinedFields((prev) => [...prev, newField]);
    setExpandedFields(prev => ({ ...prev, [tempKey]: true }));
  };

  const addNewAction = (fieldKey) => {
    const newAction = newActionInputs[fieldKey]?.trim();
    if (newAction) {
      if (!availableActions.includes(newAction)) {
        setAvailableActions(prev => [...prev, newAction]);
      }

      const field = combinedFields.find(f => f.key === fieldKey);
      if (field) {
        const updatedActions = [...(field.action || []), newAction];
        handleFieldChange(fieldKey, { ...field, action: updatedActions });
      }

      setNewActionInputs(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  const renderFieldEditor = (field, onChange, onDelete, dragHandle) => {
    if (field.key === "custom_details") return null;

    const isSelect = field.type === "select" || field.type === "multi-select";
    const multiMode = field.type === "multi-select";
    const hasMessageField = field.message !== undefined;
    const hasResponseMessage = field.response_message !== undefined;
    const hasPaymentDetails = field.label === "payment details";
    const isExpanded = expandedFields[field.key];
    const isProtected = isProtectedField(field);

    const groupArray = Array.isArray(field.group) ? field.group :
      (field.group ? [field.group] : []);

    return (
      <div className='field-editor-container'>
        <Row gutter={[16, 16]}>
          <Col span={24} className='field-header'>
            <div className="field-label-container">
              {!isProtected && (
                <span {...dragHandle} className='drag-handle'>
                  <MenuOutlined />
                </span>
              )}
              <Button
                type="text"
                icon={isExpanded ? <MinusOutlined /> : <DownOutlined />}
                onClick={() => toggleFieldExpansion(field.key)}
                className="expand-button"
              />
              {!isProtected ? (
                <Input
                  placeholder="Field Label"
                  value={field.label || ''}
                  onChange={e => onChange({ ...field, label: e.target.value })}
                  className="field-label-input"
                />
              ) : (
                <Title level={4} className="field-title">
                  {field.label}
                </Title>
              )}
            </div>
            {!isProtected && (
              <Button
                type='text'
                danger
                icon={<CloseOutlined />}
                onClick={onDelete}
                className="delete-button"
              />
            )}
          </Col>

          {isExpanded && (
            <>
              {groupCategories.length > 0 && (
                <>
                  <Col span={24}>
                    <Title level={5}>Groups</Title>
                    <Select
                      mode="multiple"
                      placeholder='Select group(s)'
                      value={groupArray}
                      onChange={(groups) => onChange({ ...field, group: groups, section: [] })}
                      size='large'
                      className="full-width-select"
                    >
                      {groupCategories.map((group) => (
                        <Option key={group} value={group}>
                          {group}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  {/* {groupArray.length > 0 && (
                    <Col span={24}>
                      <Title level={5}>Sections</Title>
                      <Select
                        mode="multiple"
                        placeholder="Select section(s)"
                        value={field.section || []}
                        onChange={(sections) => onChange({ ...field, section: sections })}
                        size='large'
                        className="full-width-select"
                      >
                        {groupArray.flatMap(groupName => {
                          const groupSections = sectionDetails[groupName] || [];
                          return groupSections.map(section => (
                            <Option key={`${groupName}-${section}`} value={section}>
                              {section}
                            </Option>
                          ));
                        })}
                      </Select>
                    </Col>
                  )} */}
                </>
              )}

              {hasMessageField && !hasPaymentDetails && (
                <Col span={24}>
                  <Row style={{ marginBottom: "10px" }} justify="space-between" align="middle">
                    <Title level={5}>Display Message</Title>
                    <Upload
                      beforeUpload={(file) => {
                        const fileType = file.type.split('/')[0]; // Get file type (image, video, etc.)
                        handleFileUpload(file, field.key, fileType);
                        return false; // Prevent default upload behavior
                      }}
                      showUploadList={false}
                      accept="image/*,video/*,audio/*"
                    >
                      <Button icon={<UploadOutlined />}>Attach file</Button>
                    </Upload>
                  </Row>

                  {/* Preview of uploaded file */}
                  {field.messageAttachment && (
                    <div className="attachment-preview" style={{ marginBottom: "10px" }}>
                      {field.messageAttachmentType?.startsWith('image/') ? (
                        <div style={{ position: 'relative', display: 'inline-block', right: "0" }}>
                          <img
                            src={field.messageAttachment}
                            alt="Attachment preview"
                            style={{ maxWidth: '200px', maxHeight: '150px' }}
                          />
                          <Button
                            type="text"
                            danger
                            icon={<CloseOutlined />}
                            style={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => {
                              onChange({
                                ...field,
                                messageAttachment: null,
                                messageAttachmentType: null
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <Text>Attachment: {field.messageAttachmentType}</Text>
                          <Button
                            type="text"
                            danger
                            icon={<CloseOutlined />}
                            style={{ position: 'absolute', top: 0, right: 0 }}
                            onClick={() => {
                              onChange({
                                ...field,
                                messageAttachment: null,
                                messageAttachmentType: null
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <TextArea
                    placeholder='Write the Display Message'
                    value={field.message}
                    onChange={(e) =>
                      onChange({ ...field, message: e.target.value })
                    }
                    size='large'
                    autoSize={{ minRows: 2, maxRows: 6 }}
                  />
                </Col>
              )}

              <Col span={24}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Space direction="vertical" size={4}>
                      {/* <Text strong>User Type</Text> */}
                      <Radio.Group
                        value={field.is_user_input}
                        onChange={(e) => {
                          const isUserInput = e.target.value;
                          onChange({
                            ...field,
                            is_user_input: isUserInput,
                            // Set mandatory to false when Announcement is selected
                            mandatory: isUserInput ? field.mandatory : false
                          });
                        }}
                      >
                        <Space direction="vertical">
                          <Radio value={false}>Announcement</Radio>
                          <Radio value={true}>Question</Radio>
                        </Space>
                      </Radio.Group>
                    </Space>
                  </Col>

                  {/* Mandatory Switch - Only show for questions */}
                  {field.is_user_input && (
                    <Col span={12}>
                      <Space direction="vertical" size={4}>
                        <Text strong>Mandatory</Text>
                        <Switch
                          checked={field.mandatory}
                          onChange={(m) => onChange({ ...field, mandatory: m })}
                        />
                      </Space>
                    </Col>
                  )}
                </Row>
              </Col>

              {!isProtected && (
                <Col span={24}>
                  <Title level={5}>User Input Type</Title>
                  <Select
                    placeholder='Select field type'
                    value={field.type}
                    onChange={(t) =>
                      onChange({
                        ...field,
                        type: t,
                        options: [],
                        value: t === "multi-select" ? [] : "",
                        message: field.message || "",
                        response_message: field.response_message || "",
                      })
                    }
                    size='large'
                    className="full-width-select">
                    {[
                      "text",
                      "number",
                      "upload file",
                      "select",
                      "multi-select",
                      "boolean",
                    ].map((t) => (
                      <Option key={t} value={t}>
                        {t}
                      </Option>
                    ))}
                  </Select>
                </Col>
              )}

              {(field.type === "image" ||
                field.type === "video" ||
                field.type === "audio") && (
                  <Col span={24} className='upload-section'>
                    <Title level={5}>
                      {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                    </Title>

                    <Upload
                      beforeUpload={(file) => {
                        handleFileUpload(file, field.key, field.type);
                        return false;
                      }}
                      showUploadList={false}>
                      <Button
                        icon={
                          uploadingField === field.key ? (
                            <LoadingOutlined />
                          ) : (
                            <UploadOutlined />
                          )
                        }
                        disabled={uploadingField === field.key}>
                        {field.value
                          ? ` change ${field.type}`
                          : `Upload ${field.type}`}
                      </Button>
                    </Upload>

                    {field.value && (
                      <div className='upload-preview-container'>
                        <Text strong className='upload-preview-label'>
                          Preview:
                        </Text>
                        {field.type === "image" ? (
                          <img
                            src={field.thumbnail || field.value}
                            alt='Uploaded content'
                            className='upload-preview-image'
                          />
                        ) : (
                          <div className='mt-2'>
                            <a
                              href={field.value}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='upload-preview-link'>
                              View {field.type}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </Col>
                )}
              {/* 
              {isSelect && (
                <Col span={24}>
                  <Title level={5}>Create Your Options</Title>
                  <Select
                    mode={multiMode ? "multiple" : undefined}
                    placeholder={`Choose ${field.label}`}
                    className='multi-select'
                    value={field.value}
                    onChange={(val) => onChange({ ...field, value: val })}
                    size='large'
                    style={{ width: "100%" }}
                    suffixIcon={null}
                    dropdownRender={(menu) => (
                      <>
                        {field.options?.length > 0 && (
                          <div className="select-options-container">
                            {field.options.map((opt) => (
                              <div
                                key={opt}
                                className="select-option-item"
                                onClick={() => {
                                  if (multiMode) {
                                    const newValue = field.value.includes(opt)
                                      ? field.value.filter((v) => v !== opt)
                                      : [...field.value, opt];
                                    onChange({ ...field, value: newValue });
                                  } else {
                                    onChange({ ...field, value: opt });
                                  }
                                }}>
                                <span>{opt}</span>
                                <Button
                                  type='text'
                                  danger
                                  size='small'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newOpts = field.options.filter(
                                      (o) => o !== opt
                                    );
                                    const newVal = multiMode
                                      ? (field.value || []).filter((v) => v !== opt)
                                      : field.value === opt
                                        ? undefined
                                        : field.value;
                                    onChange({
                                      ...field,
                                      options: newOpts,
                                      value: newVal,
                                    });
                                  }}>
                                  ❌
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="select-add-option">
                          <Input
                            placeholder='Add option'
                            value={field.newOption || ""}
                            onChange={(e) =>
                              onChange({ ...field, newOption: e.target.value })
                            }
                            onPressEnter={() => {
                              const opt = field.newOption?.trim();
                              if (opt && !(field.options || []).includes(opt)) {
                                const newOpts = [...(field.options || []), opt];
                                onChange({
                                  ...field,
                                  options: newOpts,
                                  value: multiMode
                                    ? [...(field.value || []), opt]
                                    : opt,
                                });
                              }
                            }}
                          />
                          <Button
                            type='link'
                            onClick={() => {
                              const opt = field.newOption?.trim();
                              if (opt && !(field.options || []).includes(opt)) {
                                const newOpts = [...(field.options || []), opt];
                                onChange({
                                  ...field,
                                  options: newOpts,
                                  value: multiMode
                                    ? [...(field.value || []), opt]
                                    : opt,
                                });
                              }
                            }}>
                            Add
                          </Button>
                        </div>
                      </>
                    )}>
                    {(field.options || []).map((opt) => (
                      <Option key={opt} value={opt}>
                        {opt}
                      </Option>
                    ))}
                  </Select>
                </Col>
              )} */}

              {field.type === "object" && (
                <>
                  <Col span={24}>
                    <Select
                      placeholder={`Select ${field.label}`}
                      value={field.selectedOption}
                      onChange={(o) => onChange({ ...field, selectedOption: o })}
                      size='large'
                      className="full-width-select">
                      {Object.keys(field.value).map((k) => (
                        <Option key={k} value={k}>
                          {k}
                        </Option>
                      ))}
                    </Select>
                  </Col>

                  {field.selectedOption && (
                    <>
                      <Col span={24}>
                        <Title level={5}>
                          {field.value[field.selectedOption].label}
                        </Title>
                        <Input
                          placeholder={field.value[field.selectedOption].label}
                          value={field.value[field.selectedOption].value}
                          onChange={(e) => {
                            const f = { ...field };
                            f.value[field.selectedOption].value = e.target.value;
                            onChange(f);
                          }}
                          size='large'
                          type={
                            field.value[field.selectedOption].type === "number"
                              ? "number"
                              : "text"
                          }
                        />
                      </Col>

                      {field.value[field.selectedOption].message !== undefined && (
                        <Col span={24}>
                          <TextArea
                            placeholder='Display Message'
                            value={field.value[field.selectedOption].message}
                            onChange={(e) => {
                              const f = { ...field };
                              f.value[field.selectedOption].message =
                                e.target.value;
                              onChange(f);
                            }}
                            size='large'
                            autoSize={{ minRows: 2, maxRows: 6 }}
                          />
                        </Col>
                      )}

                      {field.value[field.selectedOption].currency !== undefined && (
                        <Col span={24}>
                          <Select
                            placeholder='Currency'
                            value={field.value[field.selectedOption].currency}
                            onChange={(c) => {
                              const f = { ...field };
                              f.value[field.selectedOption].currency = c;
                              onChange(f);
                            }}
                            className="full-width-select"
                            size='large'>
                            <Option value='' disabled>
                              Select currency
                            </Option>

                            {CURRENCY_OPTIONS.map((c) => (
                              <Option key={c} value={c}>
                                {c}
                              </Option>
                            ))}
                          </Select>
                        </Col>
                      )}
                    </>
                  )}
                </>
              )}

              {field.is_user_input === true && hasResponseMessage && field.showResponseMessage && (
                <Col span={24}>
                  <div className="section-header">
                    <Title level={5}>Acknowledgement to the user response</Title>
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveSection(field.key, 'responseMessage')}
                    />
                  </div>
                  <TextArea
                    placeholder='This appears after the user has responded to your question'
                    value={field.response_message}
                    onChange={(e) =>
                      onChange({ ...field, response_message: e.target.value })
                    }
                    size='large'
                    autoSize={{ minRows: 2, maxRows: 6 }}
                  />
                </Col>
              )}

              {field.showActions && (
                <Col span={24}>
                  <div className="section-header">
                    <Title level={5}>Action label</Title>
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveSection(field.key, 'actions')}
                    />
                  </div>
                  <div className='mb-4'>
                    <Select
                      mode="multiple"
                      placeholder="Select actions"
                      value={field.action || []}
                      onChange={(actions) => onChange({ ...field, action: actions })}
                      className="full-width-select"
                      size="large"
                      dropdownRender={(menu) => (
                        <div>
                          {menu}
                          <div style={{ padding: '8px', display: 'flex' }}>
                            <Input
                              value={newActionInputs[field.key] || ''}
                              onChange={(e) => setNewActionInputs(prev => ({
                                ...prev,
                                [field.key]: e.target.value
                              }))}
                              onPressEnter={() => addNewAction(field.key)}
                              placeholder="Add new action"
                            />
                            <Button
                              type="primary"
                              onClick={() => addNewAction(field.key)}
                              style={{ marginLeft: 8 }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      )}
                    >
                      {availableActions.map((action) => (
                        <Option key={action} value={action}>
                          {action}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </Col>
              )}

              {field.showActionTypes && (
                <Col span={24}>
                  <div className="section-header">
                    <Title level={5}>Action Element</Title>
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveSection(field.key, 'actionTypes')}
                    />
                  </div>
                  <div className='mb-4'>
                    <Select
                      mode='select'
                      placeholder='Select action types'
                      value={field.action_type || []}
                      onChange={(actionTypes) => onChange({ ...field, action_type: actionTypes })}
                      className="full-width-select"
                      size='large'>
                      {ACTION_TYPE_OPTIONS.map((type) => (
                        <Option key={type} value={type}>
                          {type}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </Col>
              )}
            </>
          )}
        </Row>
      </div>
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  const hasGroupCategories = groupCategories.length > 0;

  return (
    <div className='event-edit-container'>
      <Row className='mb-6' justify='space-between'>
        <Col span={24} className='flex justify-between'>
          <Button type='primary' onClick={handleBack}>
            Back
          </Button>
          <Button type='primary' loading={isSaving} onClick={handleSubmit}>
            Update Event
          </Button>
        </Col>
      </Row>

      <div className='form-section'>
        {selectedFeatureDetail?.service_name && (
          <Title level={2} className='section-title'>
            {selectedFeatureDetail.service_name} Fields
          </Title>
        )}

        {hasGroupCategories && (
          <div className='form-section for-top-section'>
            {/* Add Group Section */}
            <div className='mb-4'>
              <Title level={5} className='subsection-title'>
                Add Group
              </Title>
              <Select
                placeholder='Select group'
                open={groupSelectOpen}
                onDropdownVisibleChange={(open) => setGroupSelectOpen(open)}
                value={nextActionField?.group || selectedFeatureDetail?.current_group}
                onChange={(group) =>
                  setNextActionField((prev) => ({ ...prev, group }))
                }
                size='large'
                className="full-width-select"
                dropdownRender={() => (
                  <>
                    <div className='custom-options-container'>
                      {groupCategories.map((group) => (
                        <div
                          key={group}
                          className='group-category-item'
                          onClick={() => {
                            setNextActionField((prev) => ({
                              ...prev,
                              group,
                            }));
                            setGroupSelectOpen(false);
                          }}
                        >
                          <span>{group}</span>
                          <Button
                            type='text'
                            danger
                            icon={<CloseOutlined />}
                            onClick={(e) => handleDeleteGroup(group, e)}
                            className='delete-btn'
                          />
                        </div>
                      ))}
                    </div>
                    <div className="add-group-container">
                      <Input
                        value={newGroupCategory}
                        onChange={(e) => setNewGroupCategory(e.target.value)}
                        placeholder='Add new group'
                      />
                      <Button
                        type='link'
                        onClick={addGroupCategory}
                        icon={<PlusOutlined />}
                      >
                        Add
                      </Button>
                    </div>
                  </>
                )}
              />
            </div>

            {/* Filter by Group Section with All option */}
            <div className='mb-4'>
              <Title level={5} className='subsection-title'>
                Filter by Group
              </Title>
              <Select
                placeholder='Select group to filter'
                value={filterGroup || "all"}
                onChange={(group) => setFilterGroup(group === "all" ? null : group)}
                size='large'
                className="full-width-select"
              >
                <Option key="all" value="all">
                  All
                </Option>
                {groupCategories.map((group) => (
                  <Option key={group} value={group}>
                    {group}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Active Group Section with Radio Buttons */}
            <div className='mb-4'>
              <Title level={5} className='subsection-title'>
                Active Group
              </Title>
              <Radio.Group
                value={selectedFeatureDetail?.current_group || null}
                onChange={(e) => {
                  const newGroup = e.target.value;
                  setNextActionField((prev) => ({ ...prev, group: newGroup }));
                  // Update the current_group in selectedFeatureDetail
                  setSelectedFeatureDetail(prev => ({
                    ...prev,
                    current_group: newGroup
                  }));
                }}
                className="full-width-radio-group"
              >
                <Space direction="vertical">
                  {groupCategories.map((group) => (
                    <Radio key={group} value={group}>
                      {group}
                    </Radio>
                  ))}
                  <Radio value={null} style={{ display: 'none' }} />
                </Space>
              </Radio.Group>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (active.id !== over?.id) {
              setCombinedFields((prev) => {
                const oldIndex = prev.findIndex((f) => f.key === active.id);
                const newIndex = prev.findIndex((f) => f.key === over.id);

                if (isProtectedField(prev[oldIndex]) || isProtectedField(prev[newIndex])) {
                  return prev;
                }
                return arrayMove(prev, oldIndex, newIndex);
              });
            }
          }}>
          <SortableContext
            items={combinedFields.map((f) => f.key)}
            strategy={verticalListSortingStrategy}>
            {/* Filter fields based on selected group - show all if filterGroup is null */}
            {combinedFields
              .filter(field => {
                if (!filterGroup) return true; // Show all fields when filterGroup is null
                const fieldGroups = Array.isArray(field.group) ? field.group :
                  (field.group ? [field.group] : []);
                return fieldGroups.includes(filterGroup);
              })
              .map((fld) => {
                const isProtected = isProtectedField(fld);
                return (
                  <SortableItem
                    key={fld.key}
                    id={fld.key}
                    disabled={isProtected}
                  >
                    {({ dragHandle }) => (
                      <Col span={24}>
                        {renderFieldEditor(
                          fld,
                          (f) => handleFieldChange(fld.key, f),
                          () => removeField(fld.key),
                          dragHandle
                        )}
                      </Col>
                    )}
                  </SortableItem>
                );
              })}
          </SortableContext>
        </DndContext>

        <Col span={24} className='mb-6'>
          <Button
            type='dashed'
            icon={<PlusOutlined />}
            block
            onClick={addNewField}>
            Add New Field
          </Button>
        </Col>

        {nextActionField && (
          <div className='form-section for-top-section'>
            <Title level={4} className='section-title'>
              Next Action Configuration
            </Title>

            <div className='mb-4'>
              <Text strong className='subsection-title'>
                Selected Next Actions
              </Text>
              <Select
                mode='multiple'
                size='large'
                className="full-width-select"
                placeholder='Choose next actions'
                value={nextActionField.value || []}
                onChange={handleNextActionChange}
                optionLabelProp='label'>
                {combinedFields
                  .filter((f) => f.key !== "custom_details")
                  .map((field) => (
                    <Option
                      key={field.key}
                      value={field.key}
                      label={field.label || field.key}>
                      {field.label || field.key}
                    </Option>
                  ))}
              </Select>
            </div>

            <div className='mb-6'>
              <Text strong className='subsection-title'>
                Configured Actions
              </Text>
              <div className='action-config-list'>
                {(nextActionField.action || []).map((action) => {
                  const actionField = combinedFields.find(
                    (f) => f.key === action.key
                  );
                  const displayLabel = actionField?.label || action.key;

                  return (
                    <div
                      key={action.key}
                      className='action-config-item'>
                      <div className='action-header'>
                        <Text strong>{displayLabel}</Text>
                        <Button
                          type='text'
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => handleDeleteAction(action.key)}
                        />
                      </div>

                      <div className='action-config-grid'>
                        <div>
                          <Text className='config-label'>Position:</Text>
                          <Select
                            value='last'
                            disabled
                            className="full-width-select">
                            <Option value='last'>Last</Option>
                          </Select>
                        </div>

                        {hasGroupCategories && (
                          <>
                            <div>
                              <Text className='config-label'>
                                Event Stage
                              </Text>
                              <Select
                                value={action.group}
                                onChange={(value) =>
                                  handleActionGroupChange(action.key, value)
                                }
                                className="full-width-select">
                                {groupCategories.map((group) => (
                                  <Option key={group} value={group}>
                                    {group}
                                  </Option>
                                ))}
                              </Select>
                            </div>

                            {/* {action.group && (
                              <div>
                                <Text className='config-label'>
                                  Sections
                                </Text>
                                <Select
                                  mode="multiple"
                                  placeholder="Select sections"
                                  value={action.section || []}
                                  onChange={(sections) => handleActionSectionChange(action.key, sections)}
                                  // size="large"
                                  className="full-width-select"
                                >
                                  {sectionDetails[action.group]?.map(section => (
                                    <Option key={section} value={section}>
                                      {section}
                                    </Option>
                                  ))}
                                </Select>
                              </div>
                            )} */}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventEdit;