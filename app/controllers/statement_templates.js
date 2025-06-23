const { getTemplates, getTemplate, updateTemplate, createTemplate: createTemplateInDb, getNextVersionNumber, deactivateOtherTemplatesOfType, getActiveTemplateByName } = require('../data/statement_templates');

async function showTemplateIndex(req, res) {
    try {
        const templates = await getTemplates();
        // Group templates by type for the view
        const activeTemplates = templates.filter(t => t.is_active);
        const previousVersions = templates.filter(t => !t.is_active)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        res.render('super_admin/statement_templates/index', {
            user: req.session.user,
            templates,
            activeTemplates,
            previousVersions,
            csrfToken: req.csrfToken(),
            successMessage: req.query.success
        });
    } catch (error) {
        console.error('Error showing templates:', error);
        res.status(500).render('error');
    }
}

async function showNewTemplate(req, res) {
    res.render('super_admin/statement_templates/new', {
        user: req.session.user,
        csrfToken: req.csrfToken(),
        template: {
            name: '',
            content: '',
            is_active: false
        },
        errors: {}
    });
}

async function createTemplate(req, res) {
    const { name, content, is_active } = req.body;

    console.log('Creating template with data:', {
        name,
        content,
        is_active,
        user_id: req.session.user.id
    });

    try {
        // Validate required fields
        const errors = {};
        if (!name) errors.name = { text: 'Enter a template name' };
        if (!content) errors.content = { text: 'Enter template content' };

        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors);
            return res.render('super_admin/statement_templates/new', {
                user: req.session.user,
                csrfToken: req.csrfToken(),
                template: { name, content, is_active: is_active === 'true' },
                errors
            });
        }

        // Get the next version number
        const version = await getNextVersionNumber(name);
        console.log('Generated version:', version);

        // Create template
        const templateData = {
            name,
            version,
            content,
            is_active: is_active === 'true',
            created_by: req.session.user.id,
            updated_by: req.session.user.id
        };
        console.log('Creating template with data:', templateData);

        const templateId = await createTemplateInDb(templateData);
        console.log('Created template with ID:', templateId);

        res.redirect('/super-admin/statement-templates');
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).render('error', {
            error: 'Something went wrong',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

async function showEditTemplate(req, res) {
    try {
        const template = await getTemplate(req.params.id);
        if (!template) {
            return res.status(404).render('404');
        }
        res.render('super_admin/statement_templates/edit', {
            user: req.session.user,
            csrfToken: req.csrfToken(),
            template,
            errors: {}
        });
    } catch (error) {
        console.error('Error showing edit template:', error);
        res.status(500).render('500');
    }
}

async function updateTemplateHandler(req, res) {
    console.log('Update template handler called with:', {
        templateId: req.params.id,
        body: req.body,
        method: req.method,
        originalMethod: req.originalMethod,
        path: req.path,
        headers: {
            'content-type': req.headers['content-type']
        }
    });

    const templateId = req.params.id;
    const { name, content, is_active } = req.body;

    try {
        // Validate required fields
        const errors = {};
        if (!name) errors.name = { text: 'Enter a template name' };
        if (!content) errors.content = { text: 'Enter template content' };

        if (Object.keys(errors).length > 0) {
            return res.render('super_admin/statement_templates/edit', {
                user: req.session.user,
                csrfToken: req.csrfToken(),
                template: { id: templateId, name, content, is_active: is_active === 'true' },
                errors
            });
        }

        // Get the next version number
        const version = await getNextVersionNumber(name);

        // If setting as active, deactivate other templates of the same type
        if (is_active === 'true') {
            await deactivateOtherTemplatesOfType(name);
        }

        // Create new template version
        await createTemplateInDb({
            name,
            version,
            content,
            is_active: is_active === 'true',
            created_by: req.session.user.id,
            updated_by: req.session.user.id
        });

        res.redirect('/super-admin/statement-templates');
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).render('error', {
            error: 'Something went wrong',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    showTemplateIndex,
    showNewTemplate,
    createTemplate,
    showEditTemplate,
    updateTemplateHandler
};