CREATE TABLE public.branch (
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    protected boolean DEFAULT false NOT NULL,
    has_merged boolean DEFAULT false NOT NULL
);
CREATE TABLE public.file (
    path text NOT NULL,
    id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    module_version text NOT NULL,
    module_name text NOT NULL,
    branch_name text NOT NULL,
    ext text NOT NULL,
    module_scope text NOT NULL
);
CREATE TABLE public.module (
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_name text NOT NULL,
    scope text NOT NULL
);
CREATE TABLE public.module_version (
    module_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    version text NOT NULL,
    branch_name text NOT NULL,
    module_scope text NOT NULL
);
ALTER TABLE ONLY public.branch
    ADD CONSTRAINT "Branch_name_key" UNIQUE (name);
ALTER TABLE ONLY public.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (name);
ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_path_module_version_module_name_module_scope_branch_name_e UNIQUE (path, module_version, module_name, module_scope, branch_name, ext);
ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.module
    ADD CONSTRAINT module_pkey PRIMARY KEY (scope, name, branch_name);
ALTER TABLE ONLY public.module_version
    ADD CONSTRAINT module_version_pkey PRIMARY KEY (version, module_name, branch_name, module_scope);
ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_branch_name_fkey FOREIGN KEY (branch_name) REFERENCES public.branch(name) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_module_scope_branch_name_module_name_fkey FOREIGN KEY (module_scope, branch_name, module_name) REFERENCES public.module(scope, branch_name, name) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_module_scope_branch_name_module_name_module_version_fke FOREIGN KEY (module_scope, branch_name, module_name, module_version) REFERENCES public.module_version(module_scope, branch_name, module_name, version) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.module
    ADD CONSTRAINT module_branch_name_fkey FOREIGN KEY (branch_name) REFERENCES public.branch(name) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.module_version
    ADD CONSTRAINT module_version_branch_name_fkey FOREIGN KEY (branch_name) REFERENCES public.branch(name) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.module_version
    ADD CONSTRAINT module_version_module_scope_branch_name_module_name_fkey FOREIGN KEY (module_scope, branch_name, module_name) REFERENCES public.module(scope, branch_name, name) ON UPDATE CASCADE ON DELETE CASCADE;
