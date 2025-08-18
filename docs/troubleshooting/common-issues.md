# Troubleshooting Common Issues

This guide helps IT professionals resolve common issues encountered while using Surge. Most problems can be resolved quickly by following the step-by-step solutions provided below.

## Table of Contents
- [Search and Discovery Issues](#search-and-discovery-issues)
- [Document Access and Loading Problems](#document-access-and-loading-problems)
- [Collaboration and Sync Issues](#collaboration-and-sync-issues)
- [Mobile and Offline Problems](#mobile-and-offline-problems)
- [Export and Download Issues](#export-and-download-issues)
- [Authentication and Permissions](#authentication-and-permissions)
- [Performance and Speed Issues](#performance-and-speed-issues)
- [Browser and Compatibility Problems](#browser-and-compatibility-problems)
- [Template and Formatting Issues](#template-and-formatting-issues)
- [Getting Additional Help](#getting-additional-help)

## Search and Discovery Issues

### Search Not Returning Expected Results

#### Problem: Search queries don't find relevant documents
**Symptoms:**
- Search returns no results for known documents
- Relevant documents don't appear in search results
- Search results seem outdated or incomplete

**Troubleshooting Steps:**
1. **Check Search Syntax**
   - Try simpler keywords instead of complex phrases
   - Remove special characters and punctuation
   - Use specific technical terms rather than general language

2. **Verify Document Access**
   - Ensure you have permission to access the documents
   - Check if documents are in workspaces you're a member of
   - Confirm documents haven't been archived or deleted

3. **Clear Search Filters**
   - Remove any applied search filters
   - Check workspace-specific search settings
   - Reset date range filters to "All time"

4. **Try Alternative Search Methods**
   - Use document titles or author names
   - Search within specific workspaces
   - Browse document categories instead of searching

**Advanced Solutions:**
```
Search Tips:
- Use quotes for exact phrases: "database backup procedure"
- Try synonyms: "server" vs "system" vs "machine"
- Include document types: "policy", "procedure", "guide"
- Search by tags: tag:security, tag:network
```

#### Problem: AI-powered search suggestions not working
**Symptoms:**
- No AI-generated answers appear
- Search suggestions are generic or unhelpful
- AI features seem disabled

**Troubleshooting Steps:**
1. **Check AI Service Status**
   - Contact your administrator about Ollama service status
   - Verify AI features are enabled for your account
   - Check if your organization has AI features configured

2. **Improve Query Phrasing**
   - Ask complete questions: "How do I restart Apache?"
   - Use natural language instead of keywords
   - Be specific about your context and needs

### Search Performance Issues

#### Problem: Search is slow or times out
**Solutions:**
- **Clear Browser Cache**: Clear your browser's cache and cookies
- **Try Simpler Queries**: Break complex searches into simpler terms
- **Check Network Connection**: Ensure stable internet connectivity
- **Use Workspace Search**: Search within specific workspaces for faster results

## Document Access and Loading Problems

### Documents Won't Load or Display Incorrectly

#### Problem: Documents fail to load or show errors
**Symptoms:**
- Blank pages when opening documents
- "Document not found" errors
- Partial loading of document content
- Formatting issues or missing images

**Troubleshooting Steps:**
1. **Refresh and Retry**
   - Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
   - Close and reopen the document
   - Clear browser cache if problem persists

2. **Check Permissions**
   - Verify you have access to the document
   - Confirm the document hasn't been moved or deleted
   - Check if you're still a member of the workspace

3. **Try Different Browser**
   - Open the document in a different browser
   - Disable browser extensions temporarily
   - Use incognito/private browsing mode

4. **Check Document Status**
   - Verify the document isn't being edited by someone else
   - Check if the document is in draft mode
   - Confirm document processing has completed

**For Large Documents:**
```
Performance Tips:
- Wait for complete loading before scrolling
- Close other browser tabs to free memory
- Use document sections/bookmarks for navigation
- Consider exporting to PDF for easier viewing
```

#### Problem: Images or attachments not displaying
**Solutions:**
1. **Check File Permissions**: Ensure images haven't been moved or access restricted
2. **Browser Security Settings**: Some browsers block mixed content (HTTP/HTTPS)
3. **Network Issues**: Large images may fail on slow connections
4. **File Format Support**: Verify the image format is supported
5. **Ad Blockers**: Disable ad blockers that might block content

### Document Versioning Issues

#### Problem: Can't access previous versions or see version history
**Troubleshooting:**
1. **Check Version Permissions**: You may not have access to version history
2. **Document Type**: Some documents may not have versioning enabled
3. **Recent Documents**: Very recent documents may not have versions yet
4. **Browser Issues**: Try refreshing or using a different browser

## Collaboration and Sync Issues

### Real-Time Collaboration Problems

#### Problem: Can't see other users' changes in real-time
**Symptoms:**
- Other users' cursors not visible
- Changes don't appear immediately
- Collaborative editing seems disabled

**Troubleshooting Steps:**
1. **Check Connection Status**
   - Look for connection indicators in the interface
   - Verify stable internet connection
   - Try refreshing the page if connection is lost

2. **Verify Collaboration Settings**
   - Confirm real-time collaboration is enabled for the document
   - Check that you and other users have edit permissions
   - Ensure the document isn't locked by another user

3. **Browser Compatibility**
   - Use a supported browser (Chrome, Firefox, Safari, Edge)
   - Enable WebSocket connections in browser settings
   - Disable VPN or proxy that might interfere

**WebSocket Connection Issues:**
```
Network Troubleshooting:
1. Check corporate firewall settings
2. Verify WebSocket connections are allowed
3. Test with different network connection
4. Contact IT if corporate proxy blocks WebSockets
```

#### Problem: Comments and mentions not working
**Common Causes and Solutions:**
1. **Notification Settings**: Check your notification preferences
2. **User Permissions**: Verify mentioned users have document access
3. **Email Delivery**: Check spam folder for email notifications
4. **Browser Notifications**: Enable browser notifications for Surge

### Sync Conflicts and Resolution

#### Problem: Sync conflicts when working offline
**Understanding Conflicts:**
- Conflicts occur when the same content is changed offline and online
- Most conflicts can be resolved automatically
- Some require manual resolution

**Resolution Steps:**
1. **Review Conflicting Changes**
   - Examine both versions carefully
   - Understand what changed and why
   - Consider the context of each change

2. **Choose Resolution Strategy**
   - **Keep Local**: Your offline changes take priority
   - **Keep Server**: Accept the online version
   - **Merge**: Combine both sets of changes

3. **Prevent Future Conflicts**
   - Sync frequently when online
   - Coordinate with team members on document editing
   - Use document locking for major edits

## Mobile and Offline Problems

### Mobile App Issues

#### Problem: Mobile app not working properly
**Symptoms:**
- App crashes or freezes
- Interface elements not responsive
- Features not working on mobile

**Troubleshooting Steps:**
1. **Update Browser/App**
   - Ensure you're using the latest browser version
   - Update the PWA if installed as an app
   - Clear browser cache and data

2. **Check Mobile Settings**
   - Ensure JavaScript is enabled
   - Verify cookies are allowed
   - Check if data saver mode is interfering

3. **Network Issues**
   - Switch between Wi-Fi and cellular data
   - Check signal strength and data speeds
   - Try disabling VPN if connected

**iOS-Specific Issues:**
```
Safari Settings Check:
1. Settings > Safari > Advanced > JavaScript (enable)
2. Settings > Safari > Privacy & Security > Block Cookies (allow)
3. Clear Safari cache: Settings > Safari > Clear History and Data
4. Try different browser (Chrome, Firefox)
```

**Android-Specific Issues:**
```
Chrome Settings Check:
1. Chrome > Settings > Site settings > JavaScript (enable)
2. Chrome > Settings > Site settings > Cookies (allow)
3. Clear Chrome data: Settings > Storage > Chrome > Clear Storage
4. Check if Chrome is updated to latest version
```

### Offline Access Problems

#### Problem: Documents not available offline
**Troubleshooting:**
1. **Check Offline Settings**
   - Verify documents are marked for offline access
   - Check available storage space on device
   - Ensure offline sync completed successfully

2. **Storage Issues**
   - Clear old offline data to make space
   - Check device storage availability
   - Review offline document priorities

3. **Sync Problems**
   - Connect to Wi-Fi for initial sync
   - Wait for offline sync to complete
   - Restart browser/app if sync seems stuck

#### Problem: Offline changes not syncing
**Resolution Steps:**
1. **Check Connection**: Ensure you're back online
2. **Manual Sync**: Try refreshing the page to trigger sync
3. **Conflict Resolution**: Resolve any sync conflicts that appear
4. **Check Changes**: Verify your changes were saved locally

## Export and Download Issues

### Export Process Problems

#### Problem: PDF exports fail or look incorrect
**Common Causes and Solutions:**

1. **Large Document Issues**
   ```
   Solutions for Large Documents:
   - Break large documents into smaller sections
   - Reduce image sizes and complexity
   - Export sections separately if needed
   - Try during off-peak hours for better performance
   ```

2. **Formatting Problems**
   - **Missing Images**: Check image permissions and file sizes
   - **Broken Layout**: Try different page size settings
   - **Font Issues**: Use standard fonts for better compatibility
   - **Color Problems**: Adjust color settings in export options

3. **Browser Compatibility**
   - Chrome generally provides best PDF export results
   - Try different browser if exports fail consistently
   - Disable browser extensions during export
   - Ensure pop-ups are allowed for download

#### Problem: Word document exports have formatting issues
**Troubleshooting:**
1. **Template Compatibility**: Use Word-compatible templates
2. **Complex Formatting**: Simplify complex layouts for better conversion
3. **Version Compatibility**: Check Word version compatibility
4. **Image Handling**: Ensure images are in supported formats

#### Problem: Export downloads fail or get stuck
**Solutions:**
1. **Browser Settings**: Check download folder permissions
2. **Pop-up Blockers**: Disable pop-up blockers for Surge
3. **File Size Limits**: Large exports may timeout - try smaller batches
4. **Network Issues**: Ensure stable connection for large downloads

## Authentication and Permissions

### Login and Access Issues

#### Problem: Can't log into Surge
**Troubleshooting Steps:**
1. **Check Credentials**
   - Verify username/email is correct
   - Ensure password is entered accurately
   - Try copying and pasting credentials to avoid typos

2. **Account Status**
   - Contact administrator to verify account is active
   - Check if password needs to be reset
   - Verify account hasn't been locked due to failed attempts

3. **Browser Issues**
   - Clear browser cookies and cache
   - Try incognito/private browsing mode
   - Disable browser extensions temporarily

4. **Network Problems**
   - Check if corporate firewall blocks access
   - Try from different network (mobile data vs. Wi-Fi)
   - Verify Surge URL is correct

**SSO Authentication Issues:**
```
Single Sign-On Troubleshooting:
1. Clear SSO cookies in browser
2. Log out of other corporate applications
3. Try SSO login from different browser
4. Contact IT if corporate SSO is not working
```

### Permission and Access Problems

#### Problem: "Access Denied" errors
**Understanding Permission Levels:**
- **No Access**: Can't see the document/workspace exists
- **View Only**: Can read but not edit or comment
- **Edit Access**: Can modify content and add comments
- **Admin Access**: Full control including permissions management

**Troubleshooting Steps:**
1. **Check Workspace Membership**
   - Verify you're a member of the required workspace
   - Check your role within the workspace
   - Request access from workspace administrator

2. **Document Permissions**
   - Some documents have individual permission settings
   - Check if document is private vs. workspace-shared
   - Verify document hasn't been moved to restricted folder

3. **Request Access**
   - Contact document owner or workspace admin
   - Use "Request Access" feature if available
   - Provide business justification for access needs

## Performance and Speed Issues

### Slow Loading and Response Times

#### Problem: Surge runs slowly
**Performance Optimization:**

1. **Browser Optimization**
   ```
   Speed Improvement Steps:
   1. Close unnecessary browser tabs
   2. Clear browser cache and cookies
   3. Disable unused browser extensions
   4. Restart browser periodically
   5. Update browser to latest version
   ```

2. **Network Optimization**
   - Check internet connection speed
   - Use Wi-Fi instead of cellular when possible
   - Close other applications using bandwidth
   - Consider using Ethernet instead of Wi-Fi

3. **Device Performance**
   - Close other applications to free RAM
   - Restart device if performance is poor
   - Check available storage space
   - Update operating system if needed

#### Problem: Specific features are slow
**Feature-Specific Solutions:**

1. **Slow Search**: Clear search filters, try simpler queries
2. **Slow Document Loading**: Check document size, try different format
3. **Slow Export**: Use smaller batches, try during off-peak hours
4. **Slow Sync**: Check network connection, reduce offline content

### Memory and Storage Issues

#### Problem: Browser crashes or "Out of memory" errors
**Solutions:**
1. **Reduce Browser Load**: Close other tabs and applications
2. **Clear Storage**: Clear browser cache, cookies, and offline data
3. **Restart Browser**: Close and restart browser completely
4. **Check System Resources**: Monitor RAM and CPU usage

## Browser and Compatibility Problems

### Browser-Specific Issues

#### Chrome Issues
**Common Problems and Solutions:**
- **Sync Issues**: Check Chrome sync settings
- **Extension Conflicts**: Disable extensions one by one to identify culprit
- **Memory Issues**: Enable "Continue running background apps" setting
- **Update Issues**: Ensure Chrome is updated to latest version

#### Safari Issues (Mac/iOS)
**Troubleshooting:**
- **WebRTC Issues**: Enable WebRTC in Safari preferences
- **Cookie Problems**: Adjust cookie settings for Surge domain
- **Private Browsing**: Some features may not work in private browsing
- **Mobile Safari**: Try request desktop site for better compatibility

#### Firefox Issues
**Common Solutions:**
- **Security Settings**: Adjust enhanced tracking protection
- **Add-on Conflicts**: Disable add-ons to test compatibility
- **Privacy Settings**: Adjust privacy settings for Surge domain
- **Cache Issues**: Clear Firefox cache and cookies

#### Edge Issues
**Troubleshooting:**
- **Legacy Support**: Ensure using new Edge, not Internet Explorer mode
- **Extension Issues**: Check if Edge extensions cause conflicts
- **Security**: Adjust SmartScreen and security settings
- **Updates**: Keep Edge updated to latest version

### Compatibility Problems

#### Problem: Features not working in older browsers
**Minimum Requirements:**
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- JavaScript must be enabled
- Cookies must be allowed
- WebSocket support required for collaboration

**Solutions:**
1. **Update Browser**: Use latest version of supported browser
2. **Feature Degradation**: Some features may have limited functionality
3. **Alternative Access**: Use mobile app or different device
4. **Contact Admin**: Request browser update if corporate-managed

## Template and Formatting Issues

### Template Problems

#### Problem: Templates not loading or applying correctly
**Troubleshooting:**
1. **Template Access**: Verify you have permission to use the template
2. **Template Version**: Check if template has been updated or deprecated
3. **Variable Conflicts**: Ensure all required template variables are provided
4. **Browser Cache**: Clear cache if template appears outdated

#### Problem: Custom formatting lost when using templates
**Solutions:**
1. **Template Override**: Some templates may override custom formatting
2. **Format Compatibility**: Not all formats supported in all templates
3. **Style Conflicts**: Custom styles may conflict with template styles
4. **Alternative Approach**: Create custom template or modify existing one

### Formatting Issues

#### Problem: Document formatting appears broken
**Common Causes:**
1. **Copy-Paste Issues**: Formatting from other applications may not transfer
2. **Browser Differences**: Formatting may appear different in different browsers
3. **Version Conflicts**: Different versions may have formatting differences
4. **Template Changes**: Template updates may affect document appearance

**Solutions:**
1. **Reformat Content**: Use Surge's native formatting tools
2. **Clear Formatting**: Remove all formatting and reapply
3. **Template Reapplication**: Try applying template again
4. **Browser Testing**: Check appearance in different browsers

## Getting Additional Help

### Self-Service Resources

#### Built-in Help
- **Help Menu**: Access help documentation from within Surge
- **Keyboard Shortcuts**: Press Ctrl/Cmd + / for quick help
- **Feature Tours**: Use guided tours for new features
- **Video Tutorials**: Access video guides if available

#### Documentation Resources
- **User Guides**: Comprehensive guides for all features
- **FAQ Section**: Frequently asked questions and answers
- **Best Practices**: Recommended approaches for common tasks
- **Update Notes**: Information about new features and changes

### Getting Support

#### Contact Your Administrator
**When to Contact Admin:**
- Account access or permission issues
- System-wide performance problems
- Integration or configuration issues
- Security-related concerns

**Information to Provide:**
- Your username/email
- Specific error messages
- Steps to reproduce the problem
- Browser and operating system details
- Screenshots of issues when helpful

#### Escalation Path
1. **Self-Troubleshooting**: Try solutions in this guide first
2. **Team Members**: Ask colleagues if they've seen similar issues
3. **Local IT Support**: Contact your organization's IT support
4. **System Administrator**: Contact Surge system administrator
5. **Vendor Support**: Administrator may escalate to Surge support team

### Reporting Bugs and Issues

#### How to Report Issues Effectively
**Include This Information:**
```
Issue Report Template:
- Problem Description: Clear description of what's wrong
- Steps to Reproduce: Exact steps that cause the problem
- Expected Behavior: What should happen instead
- Environment: Browser, OS, device type
- Screenshots: Visual evidence of the problem
- Error Messages: Exact text of any error messages
- Frequency: How often does this happen?
- Impact: How does this affect your work?
```

#### Temporary Workarounds
While waiting for issues to be resolved:
- **Use Alternative Browser**: Try different browser
- **Mobile Access**: Use mobile version if desktop has issues
- **Offline Mode**: Work offline if sync issues persist
- **Export/Import**: Use export features to preserve work
- **Alternative Methods**: Use different features to accomplish tasks

---

**Additional Resources:**
- [User Guide](../user-guide/getting-started.md) - Complete user documentation
- [Admin Guide](../admin-guide/README.md) - Administrator resources
- [Performance Optimization](../admin-guide/performance.md) - System optimization
- [Security Configuration](../admin-guide/security.md) - Security troubleshooting