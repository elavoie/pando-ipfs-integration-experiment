#!/usr/bin/env python
# import execo
import execo_g5k
# import itertools

print 'Submitting job request'
[(jobid, site)] = execo_g5k.oarsub([
    (execo_g5k.OarSubmission(resources="nodes=4"), "grenoble")
])

if jobid:
    try:
        print 'Waiting for job to start'
        execo_g5k.wait_oar_job_start(jobid, site)
        print 'Retrieving nodes'
        nodes = execo_g5k.get_oar_job_nodes(jobid, site)
        print nodes
    finally:
        execo_g5k.oardel([(jobid, site)])
