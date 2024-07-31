import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CippPage, CippMasonry, CippMasonryItem, CippContentCard } from 'src/components/layout'
import { parseEml, readEml, GBKUTF8, decode } from 'eml-parse-js'
import { useMediaPredicate } from 'react-media-hook'
import { useSelector } from 'react-redux'
import { CellDate } from 'src/components/tables'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CLink,
  CRow,
} from '@coreui/react'
import ReactTimeAgo from 'react-time-ago'
import { CippCodeBlock, ModalService } from 'src/components/utilities'
import DOMPurify from 'dompurify'
import ReactHtmlParser from 'react-html-parser'
import CippDropzone from 'src/components/utilities/CippDropzone'

const MessageViewer = ({ emlFile }) => {
  const [emlContent, setEmlContent] = useState(null)
  const [emailSource, setEmailSource] = useState(emlFile)
  const [emlError, setEmlError] = useState(false)
  const [messageHtml, setMessageHtml] = useState('')

  const getAttachmentIcon = (contentType) => {
    if (contentType.includes('image')) {
      return 'image'
    } else if (contentType.includes('audio')) {
      return 'volume-up'
    } else if (contentType.includes('video')) {
      return 'video'
    } else if (contentType.includes('text')) {
      return 'file-lines'
    } else if (contentType.includes('pdf')) {
      return 'file-pdf'
    } else if (
      contentType.includes('zip') ||
      contentType.includes('compressed') ||
      contentType.includes('tar') ||
      contentType.includes('gzip')
    ) {
      return 'file-zipper'
    } else if (contentType.includes('msword')) {
      return 'file-word'
    } else if (contentType.includes('spreadsheet')) {
      return 'file-excel'
    } else if (contentType.includes('presentation')) {
      return 'file-powerpoint'
    } else if (contentType.includes('json') || contentType.includes('xml')) {
      return 'file-code'
    } else if (contentType.includes('rfc822')) {
      return 'envelope'
    } else {
      return 'file'
    }
  }

  const downloadAttachment = (attachment, newTab = false) => {
    if (attachment?.data) {
      var contentType = attachment?.contentType?.split(';')[0] ?? 'text/plain'
      var fileBytes = attachment.data
      var fileName = attachment.name
      downloadFileBytes(fileName, fileBytes, contentType, newTab)
    } else {
      downloadFile(attachment.name, attachment.data64)
    }
  }

  const downloadFile = (fileName, base64Content, newTab) => {
    const link = document.createElement('a')
    link.href = `data:application/octet-stream;base64,${base64Content}`
    link.download = fileName
    link.click()
  }

  const downloadFileBytes = (fileName, fileBytes, contentType, newTab = false) => {
    const blob = new Blob([fileBytes], { type: contentType ?? 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    if (newTab) {
      if (contentType.includes('rfc822')) {
        var content = fileBytes
        const nestedMessage = <MessageViewer emlFile={content} />
        ModalService.open({
          body: nestedMessage,
          title: fileName,
          size: 'lg',
        })
      } else {
        const newWindow = window.open()
        newWindow.location.href = url
      }
    } else {
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d)
  }

  const showEmailModal = (emailSource) => {
    ModalService.open({
      data: emailSource,
      componentType: 'codeblock',
      title: 'Email Source',
      size: 'lg',
    })
  }

  const EmailButtons = (emailSource) => {
    return (
      <CButton onClick={() => showEmailModal(emailSource)}>
        <FontAwesomeIcon icon="file-code" className="me-2" />
        View Source
      </CButton>
    )
  }

  useEffect(() => {
    readEml(emailSource, (err, ReadEmlJson) => {
      if (err) {
        setEmlError(true)
        setEmlContent(null)
        setMessageHtml(null)
      } else {
        setEmlContent(ReadEmlJson)
        setEmlError(false)
        if (ReadEmlJson.html) {
          var sanitizedHtml = DOMPurify.sanitize(ReadEmlJson.html)
          var parsedHtml = ReactHtmlParser(sanitizedHtml)
          setMessageHtml(parsedHtml)
        } else {
          setMessageHtml(null)
        }
      }
    })
  }, [emailSource, setMessageHtml, setEmailSource, setEmlError, setEmlContent])

  var buttons = EmailButtons(emailSource)

  return (
    <>
      {emlError && (
        <CippContentCard title="Error" titleType="big" className="mt-2 mb-4">
          Unable to parse the EML file, email source is displayed below.
          <CippCodeBlock code={emailSource} language="plain" showLineNumbers={false} />
        </CippContentCard>
      )}

      {emlContent && (
        <>
          <CippContentCard
            title={emlContent?.subject ?? 'No subject'}
            titleType="big"
            className="mt-2 mb-4"
            button={buttons}
          >
            <>
              <CRow>
                <CCol lg="10" md="12">
                  <div className="email-sender">
                    <FontAwesomeIcon icon="user-circle" size={'xl'} className="me-2" />
                    <b>{emlContent?.from?.name}</b> <small>&lt;{emlContent?.from?.email}&gt;</small>
                  </div>
                  {emlContent?.to?.length > 0 && (
                    <div>
                      <small>
                        <b>To:</b>{' '}
                        {emlContent?.to?.map((to) => to.name + ' <' + to.email + '>').join(', ')}
                      </small>
                    </div>
                  )}
                  {emlContent?.cc?.length > 0 && (
                    <div>
                      <small>
                        <b>CC:</b>{' '}
                        {emlContent?.cc?.map((cc) => cc.name + ' <' + cc.email + '>').join(', ')}
                      </small>
                    </div>
                  )}
                </CCol>
                <CCol lg="2" md="12">
                  <div className="email-date" style={{ marginLeft: 'auto' }}>
                    <small>
                      <span className="me-2">
                        {emlContent.date && isValidDate(emlContent.date)
                          ? emlContent.date.toLocaleDateString()
                          : 'Invalid Date'}
                      </span>
                      {emlContent.date && isValidDate(emlContent.date) && (
                        <>
                          (<ReactTimeAgo date={emlContent.date} />)
                        </>
                      )}
                    </small>
                  </div>
                </CCol>
              </CRow>
            </>

            {emlContent.attachments && emlContent.attachments.length > 0 && (
              <CRow className="mt-3">
                <CCol>
                  {emlContent.attachments.map((attachment, index) => (
                    <CDropdown variant="btn-group" key={index} className="me-2">
                      <CDropdownToggle>
                        <FontAwesomeIcon
                          icon={getAttachmentIcon(attachment?.contentType ?? 'text/plain')}
                          className="me-2"
                        />
                        {attachment.name ?? 'No name'}
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CLink
                          className="dropdown-item"
                          onClick={() => downloadAttachment(attachment)}
                        >
                          <FontAwesomeIcon icon="download" className="me-2" />
                          Download
                        </CLink>
                        {(attachment?.contentType === undefined ||
                          attachment?.contentType?.includes('text') ||
                          attachment?.contentType?.includes('pdf') ||
                          attachment?.contentType?.includes('image') ||
                          attachment?.contentType?.includes('rfc822')) && (
                          <CLink
                            className="dropdown-item"
                            onClick={() => downloadAttachment(attachment, true)}
                          >
                            <FontAwesomeIcon icon="file-alt" className="me-2" />
                            View
                          </CLink>
                        )}
                      </CDropdownMenu>
                    </CDropdown>
                  ))}
                </CCol>
              </CRow>
            )}

            {(emlContent?.text || emlContent?.html) && (
              <CRow>
                <CCol>
                  {messageHtml ? (
                    <div className="mt-4">{messageHtml}</div>
                  ) : (
                    <div className="mt-4">
                      <CippCodeBlock
                        code={emlContent?.text ?? 'No text'}
                        language="plain"
                        showLineNumbers={false}
                      />
                    </div>
                  )}
                </CCol>
              </CRow>
            )}
          </CippContentCard>
        </>
      )}
    </>
  )
}

MessageViewer.propTypes = {
  emlFile: PropTypes.string,
}

const MessageViewerPage = () => {
  const [emlFile, setEmlFile] = useState(null)
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {
        setEmlFile(reader.result)
      }
      reader.readAsText(file)
    })
  }, [])

  return (
    <CippPage tenantSelector={false} title="View Message">
      <CippDropzone
        title="Load Message"
        titleType="big"
        onDrop={onDrop}
        accept={{ 'message/rfc822': ['.eml'] }}
        dropMessage="Drag an EML file or click to add"
        maxFiles={1}
      />
      {emlFile && <MessageViewer emlFile={emlFile} />}
    </CippPage>
  )
}

export default MessageViewerPage
